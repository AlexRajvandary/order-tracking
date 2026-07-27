using MediatR;
using OrderTracking.Application.Common.Audit;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Persistence;

namespace OrderTracking.Application.Dashboard.GetDashboardSummary;

public sealed class GetDashboardSummaryQueryHandler
    : IRequestHandler<GetDashboardSummaryQuery, DashboardSummaryDto>
{
    private readonly IOrderRepository _orderRepository;
    private readonly ICustomerRepository _customerRepository;
    private readonly IAuditLogRepository _auditLogRepository;
    private readonly IDateTimeProvider _clock;

    public GetDashboardSummaryQueryHandler(
        IOrderRepository orderRepository,
        ICustomerRepository customerRepository,
        IAuditLogRepository auditLogRepository,
        IDateTimeProvider clock)
    {
        _orderRepository = orderRepository;
        _customerRepository = customerRepository;
        _auditLogRepository = auditLogRepository;
        _clock = clock;
    }

    public async Task<DashboardSummaryDto> Handle(
        GetDashboardSummaryQuery request,
        CancellationToken cancellationToken)
    {
        var now = _clock.UtcNow;
        var startOfToday = new DateTimeOffset(now.UtcDateTime.Date, TimeSpan.Zero);
        var weekAgo = now.AddDays(-7);

        var totalOrders = await _orderRepository.CountOrdersAsync(cancellationToken);
        var totalCustomers = await _customerRepository.CountAsync(cancellationToken);
        var ordersCreatedToday = await _orderRepository
            .CountOrdersCreatedSinceAsync(startOfToday, cancellationToken);
        var ordersUpdatedLast7Days = await _orderRepository
            .CountOrdersUpdatedSinceAsync(weekAgo, cancellationToken);
        var statusChangesLast7Days = await _orderRepository
            .CountStatusChangesSinceAsync(weekAgo, cancellationToken);
        var recentOrderRows = await _orderRepository
            .GetRecentOrdersForDashboardAsync(5, cancellationToken);
        var recentStatusChangeRows = await _orderRepository
            .GetRecentStatusChangesForDashboardAsync(8, cancellationToken);
        var recentAuditRaw = await _auditLogRepository
            .GetRecentForDashboardAsync(200, cancellationToken);

        var recentOrders = recentOrderRows
            .Select(o => new DashboardRecentOrderDto(
                o.Id,
                o.TrackingCode,
                o.CustomerName,
                o.Status,
                o.CreatedAt,
                o.UpdatedAt))
            .ToList();

        var recentStatusChanges = recentStatusChangeRows
            .Select(h => new DashboardRecentStatusDto(
                h.OrderId,
                h.TrackingCode,
                h.ItemName,
                h.StatusText,
                h.Comment,
                h.ChangedAt))
            .ToList();

        var deleteOrderIds = recentAuditRaw
            .Where(a => a.Action == "DeleteOrder" && a.EntityType == "Order")
            .Select(a => a.EntityId)
            .Distinct()
            .ToList();

        var restorableOrderIds = deleteOrderIds.Count == 0
            ? new HashSet<Guid>()
            : (await _auditLogRepository
                    .GetRestorableDeletedOrderIdsAsync(deleteOrderIds, cancellationToken))
                .ToHashSet();

        var recentAudit = recentAuditRaw
            .Select(a => new DashboardAuditDto(
                a.Id,
                a.EntityType,
                a.EntityId,
                a.Action,
                a.AdminLogin,
                a.CreatedAt,
                a.Action == "DeleteOrder"
                    && a.EntityType == "Order"
                    && restorableOrderIds.Contains(a.EntityId),
                AuditValueDiff.FromStoredJson(a.OldValues, a.NewValues)
                    .Select(c => new AuditFieldChangeDto(c.Field, c.OldValue, c.NewValue))
                    .ToList()))
            .ToList();

        return new DashboardSummaryDto(
            totalOrders,
            totalCustomers,
            ordersCreatedToday,
            ordersUpdatedLast7Days,
            statusChangesLast7Days,
            recentOrders,
            recentStatusChanges,
            recentAudit);
    }
}
