using MediatR;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Models;
using OrderTracking.Application.Identity.Login;

namespace OrderTracking.Application.Identity.RefreshToken;

public sealed class RefreshTokenCommandHandler : IRequestHandler<RefreshTokenCommand, AuthResultDto>
{
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IRefreshTokenService _refreshTokenService;

    public RefreshTokenCommandHandler(
        IJwtTokenService jwtTokenService,
        IRefreshTokenService refreshTokenService)
    {
        _jwtTokenService = jwtTokenService;
        _refreshTokenService = refreshTokenService;
    }

    public async Task<AuthResultDto> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
    {
        var rotation = await _refreshTokenService.RotateAsync(
            request.RefreshToken,
            request.IpAddress,
            request.UserAgent,
            cancellationToken);

        if (rotation is null)
        {
            throw new UnauthorizedAccessException("Invalid or expired refresh token");
        }

        var (rawToken, _, user) = rotation.Value;
        var accessToken = _jwtTokenService.GenerateAccessToken(user, out var expiresAt);

        return new AuthResultDto(
            new AuthTokensDto(accessToken, expiresAt, LoginCommandHandler.MapUser(user)),
            rawToken);
    }
}
