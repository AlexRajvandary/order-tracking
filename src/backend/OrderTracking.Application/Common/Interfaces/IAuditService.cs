namespace OrderTracking.Application.Common.Interfaces;

public interface IAuditService
{
    Task WriteAsync(
        string entityType,
        Guid entityId,
        string action,
        string? oldValues,
        string? newValues,
        CancellationToken cancellationToken = default);
}
