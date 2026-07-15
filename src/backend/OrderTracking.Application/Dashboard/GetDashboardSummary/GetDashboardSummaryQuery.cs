using MediatR;

namespace OrderTracking.Application.Dashboard.GetDashboardSummary;

public sealed record GetDashboardSummaryQuery : IRequest<DashboardSummaryDto>;

public sealed record DashboardSummaryDto(
    int TotalOrders,
    int TotalCustomers,
    int OrdersCreatedToday,
    int OrdersUpdatedLast7Days,
    int StatusChangesLast7Days,
    IReadOnlyList<DashboardRecentOrderDto> RecentOrders,
    IReadOnlyList<DashboardRecentStatusDto> RecentStatusChanges,
    IReadOnlyList<DashboardAuditDto> RecentAudit);

public sealed record DashboardRecentOrderDto(
    Guid Id,
    string TrackingCode,
    string? CustomerName,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record DashboardRecentStatusDto(
    Guid OrderId,
    string TrackingCode,
    string ItemName,
    string StatusText,
    string? Comment,
    DateTimeOffset ChangedAt);

public sealed record DashboardAuditDto(
    Guid Id,
    string EntityType,
    Guid EntityId,
    string Action,
    string? AdminLogin,
    DateTimeOffset CreatedAt,
    bool CanRestore,
    IReadOnlyList<AuditFieldChangeDto> Changes);

public sealed record AuditFieldChangeDto(
    string Field,
    string? OldValue,
    string? NewValue);
