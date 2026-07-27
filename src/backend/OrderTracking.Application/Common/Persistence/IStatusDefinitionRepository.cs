using OrderTracking.Application.Common.Persistence.Models;
using OrderTracking.Domain.Entities;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Application.Common.Persistence;

public interface IStatusDefinitionRepository
{
    void Add(StatusDefinition status);

    Task<StatusDefinition?> GetByIdTrackedAsync(Guid id, CancellationToken cancellationToken = default);

    Task<StatusDefinition?> GetActiveByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<StatusDefinition>> GetScheduledForItemTypesAsync(
        IReadOnlyList<OrderItemType> itemTypes,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<StatusDefinitionListRow>> ListAsync(
        StatusDefinitionListCriteria criteria,
        CancellationToken cancellationToken = default);

    Task<StatusDefinitionAuditSnapshotRow?> GetAuditSnapshotAsync(
        Guid id,
        bool includeDeleted,
        CancellationToken cancellationToken = default);
}
