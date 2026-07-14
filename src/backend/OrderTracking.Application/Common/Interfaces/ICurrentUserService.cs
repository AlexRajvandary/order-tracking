namespace OrderTracking.Application.Common.Interfaces;

public interface ICurrentUserService
{
    Guid? UserId { get; }
    string? Login { get; }
    bool IsAuthenticated { get; }
}
