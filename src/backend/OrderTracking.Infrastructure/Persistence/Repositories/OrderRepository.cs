using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Models;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Common.Persistence.Models;
using OrderTracking.Domain.Entities;

namespace OrderTracking.Infrastructure.Persistence.Repositories;

public sealed class OrderRepository : IOrderRepository
{
    private readonly ApplicationDbContext _db;

    public OrderRepository(ApplicationDbContext db)
    {
        _db = db;
    }

    public void Add(Order order) => _db.Orders.Add(order);

    public void Remove(Order order) => _db.Orders.Remove(order);

    public void AddItem(OrderItem item) => _db.OrderItems.Add(item);

    public void RemoveItem(OrderItem item) => _db.OrderItems.Remove(item);

    public void AddStatusHistory(OrderItemStatusHistory history) =>
        _db.OrderItemStatusHistories.Add(history);

    public void RemoveStatusHistory(OrderItemStatusHistory history) =>
        _db.OrderItemStatusHistories.Remove(history);

    public void AddAttachment(OrderItemStatusAttachment attachment) =>
        _db.OrderItemStatusAttachments.Add(attachment);

    public void RemoveAttachment(OrderItemStatusAttachment attachment) =>
        _db.OrderItemStatusAttachments.Remove(attachment);

    public Task<bool> ExistsAsync(Guid id, CancellationToken cancellationToken = default) =>
        _db.Orders.AnyAsync(o => o.Id == id, cancellationToken);

    public Task<bool> ExistsByTrackingCodeAsync(string trackingCode, CancellationToken cancellationToken = default) =>
        _db.Orders.AnyAsync(o => o.TrackingCode == trackingCode, cancellationToken);

    public Task<Order?> GetByIdTrackedAsync(Guid id, CancellationToken cancellationToken = default) =>
        _db.Orders.FirstOrDefaultAsync(o => o.Id == id, cancellationToken);

    public Task<Order?> GetByIdWithCustomerAndItemsAsync(Guid id, CancellationToken cancellationToken = default) =>
        _db.Orders
            .Include(o => o.Customer)
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id, cancellationToken);

    public Task<Order?> GetByIdWithPublishedStatusHistoryAsync(Guid id, CancellationToken cancellationToken = default) =>
        _db.Orders
            .AsNoTracking()
            .Include(o => o.Customer)
            .Include(o => o.Items)
            .ThenInclude(i => i.StatusHistory.Where(h => h.IsPublished))
            .ThenInclude(h => h.Attachments)
            .FirstOrDefaultAsync(o => o.Id == id, cancellationToken);

    public Task<Order?> GetDeletedByIdWithCustomerAndItemsAsync(Guid id, CancellationToken cancellationToken = default) =>
        _db.Orders
            .IgnoreQueryFilters()
            .Include(o => o.Customer)
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id, cancellationToken);

    public Task<Order?> GetByIdUntrackedAsync(Guid id, CancellationToken cancellationToken = default) =>
        _db.Orders.AsNoTracking().FirstOrDefaultAsync(o => o.Id == id, cancellationToken);

    public Task<bool> IsActiveTrackingCodeTakenAsync(
        string trackingCode,
        CancellationToken cancellationToken = default) =>
        _db.Orders.AnyAsync(o => o.TrackingCode == trackingCode, cancellationToken);

    public Task<OrderDetailsRow?> GetDetailsByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _db.Orders
            .AsNoTracking()
            .Where(o => o.Id == id)
            .Select(o => new OrderDetailsRow(
                o.Id,
                o.TrackingCode,
                o.CustomerId,
                o.Customer != null
                    ? ((o.Customer.LastName ?? "") + " " + (o.Customer.FirstName ?? "") + " " + (o.Customer.Patronymic ?? "")).Trim()
                    : null,
                o.Customer != null ? o.Customer.Phone : null,
                o.Customer != null ? o.Customer.Telegram : null,
                o.Customer != null ? o.Customer.WhatsApp : null,
                o.Customer != null ? o.Customer.Vk : null,
                o.Customer != null ? o.Customer.Email : null,
                o.AdminNotes,
                o.CreatedByAdminId,
                o.Status.ToString(),
                o.CreatedAt,
                o.UpdatedAt ?? o.CreatedAt,
                o.ExpectedDeliveryAt,
                o.DeliveryAddressId,
                o.DeliveryCity,
                o.DeliveryStreet,
                o.DeliveryBuilding,
                o.DeliveryApartment,
                o.DeliveryPostalCode,
                o.DeliveryNote,
                o.Items
                    .OrderBy(i => i.SortOrder)
                    .Select(i => new OrderItemRow(
                        i.Id,
                        i.ItemType.ToString(),
                        i.Name,
                        i.Description,
                        i.Quantity,
                        i.UnitPrice,
                        i.CurrencyCode,
                        i.SortOrder,
                        i.CurrentStatusId,
                        i.CurrentStatusText,
                        i.CurrentStatusUpdatedAt))
                    .ToList()))
            .FirstOrDefaultAsync(cancellationToken);

    public Task<OrderTrackingPresenceRow?> GetTrackingPresenceByCodeAsync(
        string trackingCode,
        CancellationToken cancellationToken = default) =>
        _db.Orders
            .AsNoTracking()
            .Where(o => o.TrackingCode == trackingCode)
            .Select(o => new OrderTrackingPresenceRow(o.Id, o.CustomerId))
            .FirstOrDefaultAsync(cancellationToken);

    public Task<PublicTrackingOrderRow?> GetPublicTrackingByCodeAsync(
        string trackingCode,
        CancellationToken cancellationToken = default) =>
        _db.Orders
            .AsNoTracking()
            .Where(o => o.TrackingCode == trackingCode)
            .Select(o => new PublicTrackingOrderRow(
                o.TrackingCode,
                o.CreatedAt,
                o.ExpectedDeliveryAt,
                o.Status.ToString(),
                o.Items
                    .OrderBy(i => i.SortOrder)
                    .Select(i => new PublicTrackingItemRow(
                        i.Name,
                        i.ItemType.ToString(),
                        i.Quantity,
                        i.CurrentStatusText,
                        i.CurrentStatus != null ? i.CurrentStatus.Color : null,
                        i.StatusHistory
                            .Where(h => h.IsPublished)
                            .OrderByDescending(h => h.ChangedAt)
                            .Select(h => new PublicStatusHistoryRow(
                                h.StatusText,
                                h.Comment,
                                h.Country,
                                h.Location,
                                h.ChangedAt,
                                h.Attachments
                                    .OrderBy(a => a.SortOrder)
                                    .Select(a => new PublicStatusAttachmentRow(
                                        a.Id,
                                        a.ContentType,
                                        a.UploadedByAdmin.DisplayName ?? a.UploadedByAdmin.Login,
                                        a.UploadedAt))
                                    .ToList()))
                            .ToList()))
                    .ToList()))
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<PaginatedList<OrderListRow>> GetPagedAsync(
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 500);

        var query = _db.Orders.AsNoTracking();
        var totalCount = await query.CountAsync(cancellationToken);

        var items = await ProjectOrderList(query
                .OrderByDescending(o => o.CreatedAt)
                .ThenByDescending(o => o.Id)
                .Skip((page - 1) * pageSize)
                .Take(pageSize))
            .ToListAsync(cancellationToken);

        return new PaginatedList<OrderListRow>(items, totalCount, page, pageSize);
    }

    public async Task<PaginatedList<OrderListRow>> SearchAsync(
        OrderSearchCriteria criteria,
        CancellationToken cancellationToken = default)
    {
        var page = Math.Max(1, criteria.Page);
        var pageSize = Math.Clamp(criteria.PageSize, 1, 500);

        var query = _db.Orders.AsNoTracking();
        query = ApplySearchFilters(query, criteria);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await ProjectOrderList(query
                .OrderByDescending(o => o.CreatedAt)
                .ThenByDescending(o => o.Id)
                .Skip((page - 1) * pageSize)
                .Take(pageSize))
            .ToListAsync(cancellationToken);

        return new PaginatedList<OrderListRow>(items, totalCount, page, pageSize);
    }

    public async Task<PaginatedList<CustomerOrderSummaryRow>> GetByCustomerIdAsync(
        Guid customerId,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _db.Orders
            .AsNoTracking()
            .Where(o => o.CustomerId == customerId);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(o => new CustomerOrderSummaryRow(
                o.Id,
                o.TrackingCode,
                o.CreatedAt,
                o.UpdatedAt ?? o.CreatedAt))
            .ToListAsync(cancellationToken);

        return new PaginatedList<CustomerOrderSummaryRow>(items, totalCount, page, pageSize);
    }

    public async Task<OrderAuditSnapshotRow?> GetAuditSnapshotAsync(
        Guid id,
        bool includeDeleted,
        CancellationToken cancellationToken = default)
    {
        var query = _db.Orders.AsNoTracking();
        if (includeDeleted)
        {
            query = query.IgnoreQueryFilters();
        }

        return await query
            .Where(o => o.Id == id)
            .Select(o => new OrderAuditSnapshotRow(
                o.TrackingCode,
                o.CustomerId,
                o.AdminNotes,
                o.Status.ToString(),
                o.ExpectedDeliveryAt,
                o.DeliveryAddressId,
                o.DeliveryCity,
                o.DeliveryStreet,
                o.DeliveryBuilding,
                o.DeliveryApartment,
                o.DeliveryPostalCode,
                o.DeliveryNote,
                o.IsDeleted))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public Task<int> CountOrdersAsync(CancellationToken cancellationToken = default) =>
        _db.Orders.CountAsync(cancellationToken);

    public Task<int> CountOrdersCreatedSinceAsync(DateTimeOffset since, CancellationToken cancellationToken = default) =>
        _db.Orders.CountAsync(o => o.CreatedAt >= since, cancellationToken);

    public Task<int> CountOrdersUpdatedSinceAsync(DateTimeOffset since, CancellationToken cancellationToken = default) =>
        _db.Orders.CountAsync(o => (o.UpdatedAt ?? o.CreatedAt) >= since, cancellationToken);

    public async Task<IReadOnlyList<DashboardRecentOrderRow>> GetRecentOrdersForDashboardAsync(
        int take,
        CancellationToken cancellationToken = default) =>
        await _db.Orders
            .AsNoTracking()
            .OrderByDescending(o => o.CreatedAt)
            .Take(take)
            .Select(o => new DashboardRecentOrderRow(
                o.Id,
                o.TrackingCode,
                o.Customer != null
                    ? ((o.Customer.LastName ?? "") + " " + (o.Customer.FirstName ?? "") + " " + (o.Customer.Patronymic ?? "")).Trim()
                    : null,
                o.Status.ToString(),
                o.CreatedAt,
                o.UpdatedAt ?? o.CreatedAt))
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<OrderListRow>> GetAllForTelegramCsvAsync(
        CancellationToken cancellationToken = default) =>
        await ProjectOrderList(
                _db.Orders
                    .AsNoTracking()
                    .OrderByDescending(o => o.CreatedAt))
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Guid>> GetRestorableDeletedOrderIdsAsync(
        IReadOnlyList<Guid> orderIds,
        CancellationToken cancellationToken = default)
    {
        if (orderIds.Count == 0)
        {
            return [];
        }

        return await _db.Orders
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(o => orderIds.Contains(o.Id) && o.IsDeleted)
            .Select(o => o.Id)
            .ToListAsync(cancellationToken);
    }

    public Task<OrderItem?> GetItemByIdForOrderAsync(
        Guid orderId,
        Guid itemId,
        CancellationToken cancellationToken = default) =>
        _db.OrderItems.FirstOrDefaultAsync(
            i => i.Id == itemId && i.OrderId == orderId,
            cancellationToken);

    public Task<PublishedStatusRow?> GetLatestPublishedStatusForItemAsync(
        Guid itemId,
        CancellationToken cancellationToken = default) =>
        _db.OrderItemStatusHistories
            .Where(h => h.OrderItemId == itemId && h.IsPublished)
            .OrderByDescending(h => h.ChangedAt)
            .ThenByDescending(h => h.Id)
            .Select(h => new PublishedStatusRow(
                h.StatusDefinitionId,
                h.StatusText,
                h.ChangedAt))
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<int> GetMaxItemSortOrderAsync(Guid orderId, CancellationToken cancellationToken = default) =>
        await _db.OrderItems
            .Where(i => i.OrderId == orderId)
            .Select(i => (int?)i.SortOrder)
            .MaxAsync(cancellationToken) ?? -1;

    public async Task<OrderItemAuditSnapshotRow?> GetItemAuditSnapshotAsync(
        Guid itemId,
        bool includeDeleted,
        CancellationToken cancellationToken = default)
    {
        var query = _db.OrderItems.AsNoTracking();
        if (includeDeleted)
        {
            query = query.IgnoreQueryFilters();
        }

        return await query
            .Where(i => i.Id == itemId)
            .Select(i => new OrderItemAuditSnapshotRow(
                i.Name,
                i.ItemType.ToString(),
                i.Description,
                i.Quantity,
                i.UnitPrice,
                i.CurrencyCode,
                i.CurrentStatusText,
                i.IsDeleted))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public Task<OrderItemStatusHistory?> GetStatusHistoryByIdForOrderAsync(
        Guid orderId,
        Guid historyId,
        CancellationToken cancellationToken = default) =>
        _db.OrderItemStatusHistories
            .Include(h => h.OrderItem)
            .FirstOrDefaultAsync(
                h => h.Id == historyId && h.OrderItem.OrderId == orderId,
                cancellationToken);

    public Task<OrderItemStatusHistory?> GetStatusHistoryWithDetailsForUpdateAsync(
        Guid orderId,
        Guid historyId,
        CancellationToken cancellationToken = default) =>
        _db.OrderItemStatusHistories
            .Include(h => h.OrderItem)
            .Include(h => h.StatusDefinition)
            .Include(h => h.ChangedByAdmin)
            .Include(h => h.Attachments)
            .ThenInclude(a => a.UploadedByAdmin)
            .FirstOrDefaultAsync(
                h => h.Id == historyId && h.OrderItem.OrderId == orderId,
                cancellationToken);

    public Task<OrderItemStatusHistory?> GetStatusHistoryWithAttachmentsForUpdateAsync(
        Guid orderId,
        Guid historyId,
        CancellationToken cancellationToken = default) =>
        _db.OrderItemStatusHistories
            .Include(h => h.OrderItem)
            .Include(h => h.Attachments)
            .FirstOrDefaultAsync(
                h => h.Id == historyId && h.OrderItem.OrderId == orderId,
                cancellationToken);

    public async Task<DateTimeOffset?> GetEarliestStatusChangedAtForOrderAsync(
        Guid orderId,
        Guid? excludeHistoryId = null,
        CancellationToken cancellationToken = default)
    {
        var query = _db.OrderItemStatusHistories
            .Where(h => h.OrderItem.OrderId == orderId);

        if (excludeHistoryId is { } excludedId)
        {
            query = query.Where(h => h.Id != excludedId);
        }

        return await query
            .OrderBy(h => h.ChangedAt)
            .Select(h => (DateTimeOffset?)h.ChangedAt)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<StatusHistoryListRow>> GetStatusHistoryForOrderAsync(
        Guid orderId,
        CancellationToken cancellationToken = default) =>
        await _db.OrderItemStatusHistories
            .AsNoTracking()
            .Where(h => h.OrderItem.OrderId == orderId)
            .OrderByDescending(h => h.ChangedAt)
            .Select(h => new StatusHistoryListRow(
                h.Id,
                h.OrderItemId,
                h.OrderItem.Name,
                h.OrderItem.ItemType.ToString(),
                h.StatusDefinitionId,
                h.StatusText,
                h.StatusDefinition != null ? h.StatusDefinition.Color : null,
                h.Comment,
                h.Country,
                h.Location,
                h.PublishAt,
                h.IsPublished,
                h.ChangedByAdminId,
                h.ChangedByAdmin.DisplayName ?? h.ChangedByAdmin.Login,
                h.ChangedAt,
                h.Attachments
                    .OrderBy(a => a.SortOrder)
                    .Select(a => new StatusHistoryAttachmentRow(
                        a.Id,
                        a.ContentType,
                        a.UploadedByAdminId,
                        a.UploadedByAdmin.DisplayName ?? a.UploadedByAdmin.Login,
                        a.UploadedAt))
                    .ToList()))
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<OrderItemStatusHistory>> GetDueScheduledHistoriesAsync(
        DateTimeOffset now,
        CancellationToken cancellationToken = default) =>
        await _db.OrderItemStatusHistories
            .Include(h => h.OrderItem)
            .Where(h => !h.IsPublished && h.PublishAt != null && h.PublishAt <= now)
            .OrderBy(h => h.PublishAt)
            .ThenBy(h => h.Id)
            .ToListAsync(cancellationToken);

    public Task<int> ClaimScheduledHistoryPublishAsync(
        Guid historyId,
        DateTimeOffset changedAt,
        CancellationToken cancellationToken = default) =>
        _db.OrderItemStatusHistories
            .Where(h => h.Id == historyId && !h.IsPublished)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(h => h.IsPublished, true)
                    .SetProperty(h => h.ChangedAt, changedAt),
                cancellationToken);

    public async Task<bool> TryClaimTelegramNotifyAsync(
        Guid historyId,
        DateTimeOffset notifiedAt,
        CancellationToken cancellationToken = default)
    {
        var rows = await _db.OrderItemStatusHistories
            .Where(h => h.Id == historyId && h.TelegramNotifiedAt == null && h.IsPublished)
            .ExecuteUpdateAsync(
                setters => setters.SetProperty(h => h.TelegramNotifiedAt, notifiedAt),
                cancellationToken);

        return rows > 0;
    }

    public Task ClearTelegramNotifyClaimAsync(Guid historyId, CancellationToken cancellationToken = default) =>
        _db.OrderItemStatusHistories
            .Where(h => h.Id == historyId && h.TelegramNotifiedAt != null)
            .ExecuteUpdateAsync(
                setters => setters.SetProperty(h => h.TelegramNotifiedAt, (DateTimeOffset?)null),
                cancellationToken);

    public Task<int> CountStatusChangesSinceAsync(DateTimeOffset since, CancellationToken cancellationToken = default) =>
        _db.OrderItemStatusHistories.CountAsync(h => h.ChangedAt >= since, cancellationToken);

    public async Task<IReadOnlyList<DashboardRecentStatusRow>> GetRecentStatusChangesForDashboardAsync(
        int take,
        CancellationToken cancellationToken = default) =>
        await _db.OrderItemStatusHistories
            .AsNoTracking()
            .OrderByDescending(h => h.ChangedAt)
            .Take(take)
            .Select(h => new DashboardRecentStatusRow(
                h.OrderItem.OrderId,
                h.OrderItem.Order.TrackingCode,
                h.OrderItem.Name,
                h.StatusText,
                h.Comment,
                h.ChangedAt))
            .ToListAsync(cancellationToken);

    public Task<OrderItemStatusAttachment?> GetAttachmentByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default) =>
        _db.OrderItemStatusAttachments
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

    public Task<OrderItemStatusAttachment?> GetAttachmentWithHistoryAsync(
        Guid id,
        CancellationToken cancellationToken = default) =>
        _db.OrderItemStatusAttachments
            .Include(a => a.StatusHistory)
            .ThenInclude(h => h.OrderItem)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

    public Task<OrderItemStatusAttachment?> GetAttachmentForOrderHistoryAsync(
        Guid orderId,
        Guid historyId,
        Guid attachmentId,
        CancellationToken cancellationToken = default) =>
        _db.OrderItemStatusAttachments
            .Include(a => a.StatusHistory)
            .ThenInclude(h => h.OrderItem)
            .FirstOrDefaultAsync(
                a => a.Id == attachmentId
                     && a.StatusHistoryId == historyId
                     && a.StatusHistory.OrderItem.OrderId == orderId,
                cancellationToken);

    private static IQueryable<Order> ApplySearchFilters(IQueryable<Order> query, OrderSearchCriteria criteria)
    {
        if (!string.IsNullOrWhiteSpace(criteria.TrackingCode))
        {
            var code = criteria.TrackingCode.Trim().ToUpperInvariant();
            query = query.Where(o => o.TrackingCode.Contains(code));
        }

        if (!string.IsNullOrWhiteSpace(criteria.CustomerName))
        {
            var name = criteria.CustomerName.Trim().ToLower();
            query = query.Where(o =>
                o.Customer != null
                && (
                    (o.Customer.LastName != null && o.Customer.LastName.ToLower().Contains(name))
                    || (o.Customer.FirstName != null && o.Customer.FirstName.ToLower().Contains(name))
                    || (o.Customer.Patronymic != null && o.Customer.Patronymic.ToLower().Contains(name))
                    || ((o.Customer.LastName ?? "") + " " + (o.Customer.FirstName ?? "") + " " + (o.Customer.Patronymic ?? ""))
                        .ToLower()
                        .Contains(name)));
        }

        if (!string.IsNullOrWhiteSpace(criteria.Phone))
        {
            var phone = criteria.Phone.Trim();
            query = query.Where(o =>
                o.Customer != null
                && o.Customer.Phone != null
                && o.Customer.Phone.Contains(phone));
        }

        if (!string.IsNullOrWhiteSpace(criteria.Q))
        {
            var term = criteria.Q.Trim();
            var termLower = term.ToLower();
            var termUpper = term.ToUpperInvariant();

            query = query.Where(o =>
                o.TrackingCode.Contains(termUpper)
                || (o.Customer != null
                    && (
                        (o.Customer.LastName != null && o.Customer.LastName.ToLower().Contains(termLower))
                        || (o.Customer.FirstName != null && o.Customer.FirstName.ToLower().Contains(termLower))
                        || (o.Customer.Patronymic != null && o.Customer.Patronymic.ToLower().Contains(termLower))
                        || ((o.Customer.LastName ?? "") + " " + (o.Customer.FirstName ?? "") + " " + (o.Customer.Patronymic ?? ""))
                            .ToLower()
                            .Contains(termLower)))
                || (o.Customer != null && o.Customer.Phone != null && o.Customer.Phone.Contains(term)));
        }

        return query;
    }

    private static IQueryable<OrderListRow> ProjectOrderList(IQueryable<Order> query) =>
        query.Select(o => new OrderListRow(
            o.Id,
            o.TrackingCode,
            o.CustomerId,
            o.Customer != null
                ? ((o.Customer.LastName ?? "") + " " + (o.Customer.FirstName ?? "") + " " + (o.Customer.Patronymic ?? "")).Trim()
                : null,
            o.Customer != null ? o.Customer.Phone : null,
            o.Customer != null ? o.Customer.Email : null,
            o.Customer != null ? o.Customer.Telegram : null,
            o.Customer != null ? o.Customer.WhatsApp : null,
            o.Customer != null ? o.Customer.Vk : null,
            o.AdminNotes,
            o.Status.ToString(),
            o.Items.Count,
            o.CreatedAt,
            o.UpdatedAt ?? o.CreatedAt));
}
