namespace OrderTracking.Application.Customers.Models;

public sealed record CustomerDto(
    Guid Id,
    string? LastName,
    string? FirstName,
    string? Patronymic,
    string? FullName,
    string? Telegram,
    string? Phone,
    string? Email,
    string? Notes,
    DateTimeOffset CreatedAt,
    int OrdersCount);

public sealed record CustomerOrderSummaryDto(
    Guid Id,
    string TrackingCode,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
