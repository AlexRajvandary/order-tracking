using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Models;
using OrderTracking.Application.Identity.Login;

namespace OrderTracking.Application.Identity.TelegramLogin;

public sealed class TelegramLoginCommandHandler : IRequestHandler<TelegramLoginCommand, AuthResultDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ITelegramAuthValidator _telegramAuth;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IRefreshTokenService _refreshTokenService;
    private readonly IDateTimeProvider _clock;

    public TelegramLoginCommandHandler(
        IApplicationDbContext context,
        ITelegramAuthValidator telegramAuth,
        IJwtTokenService jwtTokenService,
        IRefreshTokenService refreshTokenService,
        IDateTimeProvider clock)
    {
        _context = context;
        _telegramAuth = telegramAuth;
        _jwtTokenService = jwtTokenService;
        _refreshTokenService = refreshTokenService;
        _clock = clock;
    }

    public async Task<AuthResultDto> Handle(TelegramLoginCommand request, CancellationToken cancellationToken)
    {
        var error = _telegramAuth.Validate(request.Data);
        if (error is not null)
        {
            throw new UnauthorizedAccessException(error);
        }

        var user = await _context.AdminUsers
            .FirstOrDefaultAsync(u => u.TelegramId == request.Data.Id, cancellationToken);

        if (user is null || !user.IsActive)
        {
            throw new UnauthorizedAccessException(
                "Telegram account is not linked to an active admin. Ask another admin to link it.");
        }

        if (!string.IsNullOrWhiteSpace(request.Data.Username))
        {
            user.TelegramUsername = request.Data.Username.Trim().TrimStart('@');
        }

        user.LastSeenAt = _clock.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        var accessToken = _jwtTokenService.GenerateAccessToken(user, out var expiresAt);
        var (refreshToken, _) = await _refreshTokenService.CreateAsync(
            user,
            request.IpAddress,
            request.UserAgent,
            cancellationToken);

        return new AuthResultDto(
            new AuthTokensDto(accessToken, expiresAt, LoginCommandHandler.MapUser(user)),
            refreshToken);
    }
}
