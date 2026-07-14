using OrderTracking.Domain.Enums;

namespace OrderTracking.Application.Orders.Models;

public sealed record OrderListItemDto(
    Guid Id,
    string TrackingCode,
    Guid? CustomerId,
    string? CustomerName,
    string? CustomerPhone,
    string? AdminNotes,
    string Status,
    int ItemsCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record OrderItemDto(
    Guid Id,
    string ItemType,
    string Name,
    string? Description,
    int Quantity,
    int SortOrder,
    Guid? CurrentStatusId,
    string? CurrentStatusText,
    DateTimeOffset? CurrentStatusUpdatedAt);

public sealed record OrderDetailsDto(
    Guid Id,
    string TrackingCode,
    Guid? CustomerId,
    string? CustomerName,
    string? CustomerPhone,
    string? CustomerTelegram,
    string? CustomerEmail,
    string? AdminNotes,
    Guid CreatedByAdminId,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? ExpectedDeliveryAt,
    IReadOnlyList<OrderItemDto> Items);

public sealed record CreateOrderItemDto(
    OrderItemType ItemType,
    string Name,
    string? Description,
    int Quantity = 1);

public sealed record TrackingLinkDto(
    string TrackingCode,
    string TrackingUrl);
