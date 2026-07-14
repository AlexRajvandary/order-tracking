using OrderTracking.Domain.Entities;

namespace OrderTracking.Application.Common.Interfaces;

public interface IRefreshTokenService
{
    Task<(string RawToken, RefreshToken Entity)> CreateAsync(
        AdminUser user,
        string? ipAddress,
        string? userAgent,
        CancellationToken cancellationToken = default);

    Task<(string RawToken, RefreshToken Entity, AdminUser User)?> RotateAsync(
        string rawToken,
        string? ipAddress,
        string? userAgent,
        CancellationToken cancellationToken = default);

    Task RevokeAsync(string rawToken, CancellationToken cancellationToken = default);

    Task RevokeAllForUserAsync(Guid userId, CancellationToken cancellationToken = default);
}
