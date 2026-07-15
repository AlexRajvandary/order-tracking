using OrderTracking.Domain.Enums;

namespace OrderTracking.Application.Common.Interfaces;

public interface ICurrentUserService
{
    Guid? UserId { get; }
    string? Login { get; }
    AdminRole? Role { get; }
    bool IsAuthenticated { get; }
}
