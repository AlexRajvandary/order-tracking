using OrderTracking.Domain.Enums;

namespace OrderTracking.Application.Orders.Models;

public sealed record OrderListItemDto(
    Guid Id,
    string TrackingCode,
    Guid? CustomerId,
    string? CustomerName,
    string? CustomerPhone,
    string? CustomerWhatsApp,
    string? CustomerVk,
    string? CustomerEmail,
    string? CustomerTelegram,
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
    decimal? UnitPrice,
    string? CurrencyCode,
    int SortOrder,
    Guid? CurrentStatusId,
    string? CurrentStatusText,
    DateTimeOffset? CurrentStatusUpdatedAt,
    string? SourceUrl);

public sealed record OrderDetailsDto(
    Guid Id,
    string TrackingCode,
    Guid? CustomerId,
    string? CustomerName,
    string? CustomerPhone,
    string? CustomerTelegram,
    string? CustomerWhatsApp,
    string? CustomerVk,
    string? CustomerEmail,
    string? AdminNotes,
    Guid CreatedByAdminId,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? ExpectedDeliveryAt,
    Guid? DeliveryAddressId,
    string? DeliveryCity,
    string? DeliveryStreet,
    string? DeliveryBuilding,
    string? DeliveryApartment,
    string? DeliveryPostalCode,
    string? DeliveryNote,
    IReadOnlyList<OrderItemDto> Items);

public sealed record CreateOrderItemDto(
    OrderItemType ItemType,
    string Name,
    string? Description,
    int Quantity = 1,
    decimal? UnitPrice = null,
    string? CurrencyCode = null,
    string? SourceUrl = null);

public sealed record CreateOrderDeliveryAddressDto(
    string? City,
    string? Street,
    string? Building,
    string? Apartment,
    string? PostalCode,
    string? Note);

public sealed record TrackingLinkDto(
    string TrackingCode,
    string TrackingUrl);
