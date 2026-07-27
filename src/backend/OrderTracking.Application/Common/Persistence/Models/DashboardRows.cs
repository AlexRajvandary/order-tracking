namespace OrderTracking.Application.Common.Persistence.Models;

public sealed record DashboardRecentOrderRow(
    Guid Id,
    string TrackingCode,
    string? CustomerName,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record DashboardRecentStatusRow(
    Guid OrderId,
    string TrackingCode,
    string ItemName,
    string StatusText,
    string? Comment,
    DateTimeOffset ChangedAt);
