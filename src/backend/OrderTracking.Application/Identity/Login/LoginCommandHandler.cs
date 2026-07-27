using MediatR;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Models;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Identity;

namespace OrderTracking.Application.Identity.Login;

public sealed class LoginCommandHandler : IRequestHandler<LoginCommand, AuthResultDto>
{
    private readonly IAdminUserRepository _adminUsers;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IRefreshTokenService _refreshTokenService;
    private readonly IDateTimeProvider _clock;

    public LoginCommandHandler(
        IAdminUserRepository adminUsers,
        IUnitOfWork unitOfWork,
        IPasswordHasher passwordHasher,
        IJwtTokenService jwtTokenService,
        IRefreshTokenService refreshTokenService,
        IDateTimeProvider clock)
    {
        _adminUsers = adminUsers;
        _unitOfWork = unitOfWork;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
        _refreshTokenService = refreshTokenService;
        _clock = clock;
    }

    public async Task<AuthResultDto> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var user = await _adminUsers.GetByLoginAsync(request.Login, cancellationToken);

        if (user is null ||
            !user.IsActive ||
            !_passwordHasher.Verify(user, request.Password, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Invalid login or password");
        }

        user.LastSeenAt = _clock.UtcNow;
        await _unitOfWork.SaveChangesAsync(cancellationToken);

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
            user.TelegramUsername,
            user.TelegramAvatarUrl);
}
