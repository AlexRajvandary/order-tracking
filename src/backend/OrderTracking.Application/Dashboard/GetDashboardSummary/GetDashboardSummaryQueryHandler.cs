using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Audit;
using OrderTracking.Application.Common.Interfaces;

namespace OrderTracking.Application.Dashboard.GetDashboardSummary;

public sealed class GetDashboardSummaryQueryHandler
    : IRequestHandler<GetDashboardSummaryQuery, DashboardSummaryDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeProvider _clock;

    public GetDashboardSummaryQueryHandler(
        IApplicationDbContext context,
        IDateTimeProvider clock)
    {
        _context = context;
        _clock = clock;
    }

    public async Task<DashboardSummaryDto> Handle(
        GetDashboardSummaryQuery request,
        CancellationToken cancellationToken)
    {
        var now = _clock.UtcNow;
        var startOfToday = new DateTimeOffset(now.UtcDateTime.Date, TimeSpan.Zero);
        var weekAgo = now.AddDays(-7);

        var totalOrders = await _context.Orders.CountAsync(cancellationToken);
        var totalCustomers = await _context.Customers.CountAsync(cancellationToken);

        var ordersCreatedToday = await _context.Orders
            .CountAsync(o => o.CreatedAt >= startOfToday, cancellationToken);

        var ordersUpdatedLast7Days = await _context.Orders
            .CountAsync(o => (o.UpdatedAt ?? o.CreatedAt) >= weekAgo, cancellationToken);

        var statusChangesLast7Days = await _context.OrderItemStatusHistories
            .CountAsync(h => h.ChangedAt >= weekAgo, cancellationToken);

        var recentOrders = await _context.Orders
            .AsNoTracking()
            .OrderByDescending(o => o.CreatedAt)
            .Take(5)
            .Select(o => new DashboardRecentOrderDto(
                o.Id,
                o.TrackingCode,
                o.Customer != null
                    ? ((o.Customer.LastName ?? "") + " " + (o.Customer.FirstName ?? "") + " " + (o.Customer.Patronymic ?? "")).Trim()
                    : null,
                o.CreatedAt,
                o.UpdatedAt ?? o.CreatedAt))
            .ToListAsync(cancellationToken);

        var recentStatusChanges = await _context.OrderItemStatusHistories
            .AsNoTracking()
            .OrderByDescending(h => h.ChangedAt)
            .Take(8)
            .Select(h => new DashboardRecentStatusDto(
                h.OrderItem.OrderId,
                h.OrderItem.Order.TrackingCode,
                h.OrderItem.Name,
                h.StatusText,
                h.Comment,
                h.ChangedAt))
            .ToListAsync(cancellationToken);

        var recentAuditRaw = await _context.AuditLogs
            .AsNoTracking()
            .OrderByDescending(a => a.CreatedAt)
            .Take(200)
            .Select(a => new
            {
                a.Id,
                a.EntityType,
                a.EntityId,
                a.Action,
                AdminLogin = a.AdminUser != null ? a.AdminUser.Login : null,
                a.CreatedAt,
                a.OldValues,
                a.NewValues,
            })
            .ToListAsync(cancellationToken);

        var deleteOrderIds = recentAuditRaw
            .Where(a => a.Action == "DeleteOrder" && a.EntityType == "Order")
            .Select(a => a.EntityId)
            .Distinct()
            .ToList();

        var restorableOrderIds = deleteOrderIds.Count == 0
            ? new HashSet<Guid>()
            : (await _context.Orders
                    .IgnoreQueryFilters()
                    .AsNoTracking()
                    .Where(o => deleteOrderIds.Contains(o.Id) && o.IsDeleted)
                    .Select(o => o.Id)
                    .ToListAsync(cancellationToken))
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
