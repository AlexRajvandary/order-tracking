using OrderTracking.Application.Common.Models;
using OrderTracking.Application.Common.Persistence.Models;
using OrderTracking.Domain.Entities;

namespace OrderTracking.Application.Common.Persistence;

public interface IOrderRepository
{
    void Add(Order order);

    void Remove(Order order);

    void AddItem(OrderItem item);

    void RemoveItem(OrderItem item);

    void AddStatusHistory(OrderItemStatusHistory history);

    void RemoveStatusHistory(OrderItemStatusHistory history);

    void AddAttachment(OrderItemStatusAttachment attachment);

    void RemoveAttachment(OrderItemStatusAttachment attachment);

    Task<bool> ExistsAsync(Guid id, CancellationToken cancellationToken = default);

    Task<bool> ExistsByTrackingCodeAsync(string trackingCode, CancellationToken cancellationToken = default);

    Task<Order?> GetByIdTrackedAsync(Guid id, CancellationToken cancellationToken = default);

    Task<Order?> GetByIdWithCustomerAndItemsAsync(Guid id, CancellationToken cancellationToken = default);

    Task<Order?> GetByIdWithPublishedStatusHistoryAsync(Guid id, CancellationToken cancellationToken = default);

    Task<Order?> GetDeletedByIdWithCustomerAndItemsAsync(Guid id, CancellationToken cancellationToken = default);

    Task<Order?> GetByIdUntrackedAsync(Guid id, CancellationToken cancellationToken = default);

    Task<bool> IsActiveTrackingCodeTakenAsync(string trackingCode, CancellationToken cancellationToken = default);

    Task<OrderDetailsRow?> GetDetailsByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<PublicTrackingOrderRow?> GetPublicTrackingByCodeAsync(
        string trackingCode,
        CancellationToken cancellationToken = default);

    Task<OrderTrackingPresenceRow?> GetTrackingPresenceByCodeAsync(
        string trackingCode,
        CancellationToken cancellationToken = default);

    Task<PaginatedList<OrderListRow>> GetPagedAsync(
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<PaginatedList<OrderListRow>> SearchAsync(
        OrderSearchCriteria criteria,
        CancellationToken cancellationToken = default);

    Task<PaginatedList<CustomerOrderSummaryRow>> GetByCustomerIdAsync(
        Guid customerId,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<OrderAuditSnapshotRow?> GetAuditSnapshotAsync(
        Guid id,
        bool includeDeleted,
        CancellationToken cancellationToken = default);

    Task<int> CountOrdersAsync(CancellationToken cancellationToken = default);

    Task<int> CountOrdersCreatedSinceAsync(DateTimeOffset since, CancellationToken cancellationToken = default);

    Task<int> CountOrdersUpdatedSinceAsync(DateTimeOffset since, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<DashboardRecentOrderRow>> GetRecentOrdersForDashboardAsync(
        int take,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<OrderListRow>> GetAllForTelegramCsvAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Guid>> GetRestorableDeletedOrderIdsAsync(
        IReadOnlyList<Guid> orderIds,
        CancellationToken cancellationToken = default);

    Task<OrderItem?> GetItemByIdForOrderAsync(
        Guid orderId,
        Guid itemId,
        CancellationToken cancellationToken = default);

    Task<PublishedStatusRow?> GetLatestPublishedStatusForItemAsync(
        Guid itemId,
        CancellationToken cancellationToken = default);

    Task<int> GetMaxItemSortOrderAsync(Guid orderId, CancellationToken cancellationToken = default);

    Task<OrderItemAuditSnapshotRow?> GetItemAuditSnapshotAsync(
        Guid itemId,
        bool includeDeleted,
        CancellationToken cancellationToken = default);

    Task<OrderItemStatusHistory?> GetStatusHistoryByIdForOrderAsync(
        Guid orderId,
        Guid historyId,
        CancellationToken cancellationToken = default);

    Task<OrderItemStatusHistory?> GetStatusHistoryWithDetailsForUpdateAsync(
        Guid orderId,
        Guid historyId,
        CancellationToken cancellationToken = default);

    Task<OrderItemStatusHistory?> GetStatusHistoryWithAttachmentsForUpdateAsync(
        Guid orderId,
        Guid historyId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<StatusHistoryListRow>> GetStatusHistoryForOrderAsync(
        Guid orderId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Earliest <see cref="OrderItemStatusHistory.ChangedAt"/> for the order.
    /// Optionally excludes one history row (e.g. when its date is being updated in memory).
    /// </summary>
    Task<DateTimeOffset?> GetEarliestStatusChangedAtForOrderAsync(
        Guid orderId,
        Guid? excludeHistoryId = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<OrderItemStatusHistory>> GetDueScheduledHistoriesAsync(
        DateTimeOffset now,
        CancellationToken cancellationToken = default);

    Task<int> ClaimScheduledHistoryPublishAsync(
        Guid historyId,
        DateTimeOffset changedAt,
        CancellationToken cancellationToken = default);

    Task<bool> TryClaimTelegramNotifyAsync(
        Guid historyId,
        DateTimeOffset notifiedAt,
        CancellationToken cancellationToken = default);

    Task ClearTelegramNotifyClaimAsync(Guid historyId, CancellationToken cancellationToken = default);

    Task<int> CountStatusChangesSinceAsync(DateTimeOffset since, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<DashboardRecentStatusRow>> GetRecentStatusChangesForDashboardAsync(
        int take,
        CancellationToken cancellationToken = default);

    Task<OrderItemStatusAttachment?> GetAttachmentByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<OrderItemStatusAttachment?> GetAttachmentWithHistoryAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<OrderItemStatusAttachment?> GetAttachmentForOrderHistoryAsync(
        Guid orderId,
        Guid historyId,
        Guid attachmentId,
        CancellationToken cancellationToken = default);
}
