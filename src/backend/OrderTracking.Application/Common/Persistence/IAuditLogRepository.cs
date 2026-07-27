using OrderTracking.Application.Common.Persistence.Models;
using OrderTracking.Domain.Entities;

namespace OrderTracking.Application.Common.Persistence;

public interface IAuditLogRepository
{
    void Add(AuditLogEntry entry);

    Task<AuditLogDetailRow?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<bool> IsDeletedOrderRestorableAsync(Guid orderId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AuditLogRecentRow>> GetRecentForDashboardAsync(
        int take,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Guid>> GetRestorableDeletedOrderIdsAsync(
        IReadOnlyList<Guid> orderIds,
        CancellationToken cancellationToken = default);
}
