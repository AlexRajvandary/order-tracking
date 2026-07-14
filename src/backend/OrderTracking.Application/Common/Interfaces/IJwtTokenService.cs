using OrderTracking.Domain.Entities;

namespace OrderTracking.Application.Common.Interfaces;

public interface IJwtTokenService
{
    string GenerateAccessToken(AdminUser user, out DateTimeOffset expiresAt);
}
