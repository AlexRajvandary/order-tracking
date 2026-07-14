using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Models;
using OrderTracking.Application.Identity;

namespace OrderTracking.Application.Identity.Login;

public sealed class LoginCommandHandler : IRequestHandler<LoginCommand, AuthResultDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IRefreshTokenService _refreshTokenService;
    private readonly IDateTimeProvider _clock;

    public LoginCommandHandler(
        IApplicationDbContext context,
        IPasswordHasher passwordHasher,
        IJwtTokenService jwtTokenService,
        IRefreshTokenService refreshTokenService,
        IDateTimeProvider clock)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
        _refreshTokenService = refreshTokenService;
        _clock = clock;
    }

    public async Task<AuthResultDto> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var user = await _context.AdminUsers
            .FirstOrDefaultAsync(u => u.Login == request.Login, cancellationToken);

        if (user is null ||
            !user.IsActive ||
            !_passwordHasher.Verify(user, request.Password, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Invalid login or password");
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
            new AuthTokensDto(accessToken, expiresAt, MapUser(user)),
            refreshToken);
    }

    internal static CurrentUserDto MapUser(Domain.Entities.AdminUser user) =>
        new(
            user.Id,
            user.Login,
            user.DisplayName,
            user.Role.ToString(),
            UserSettingsHelper.Parse(user.SettingsJson),
            user.TelegramId,
            user.TelegramUsername);
}
