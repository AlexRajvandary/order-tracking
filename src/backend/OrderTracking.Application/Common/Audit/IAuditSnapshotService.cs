namespace OrderTracking.Application.Common.Audit;

public interface IAuditSnapshotService
{
    Task<IReadOnlyDictionary<string, string?>?> CaptureAsync(
        object request,
        string entityType,
        bool includeDeleted,
        CancellationToken cancellationToken = default);
}
