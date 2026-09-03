namespace OrderTracking.Application.Common.Persistence.Models;

public sealed record OrderListRow(
    Guid Id,
    string TrackingCode,
    Guid? CustomerId,
    string? CustomerName,
    string? CustomerPhone,
    string? CustomerEmail,
    string? CustomerTelegram,
    string? CustomerWhatsApp,
    string? CustomerVk,
    string? AdminNotes,
    string Status,
    int ItemsCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record OrderSearchCriteria(
    string? TrackingCode,
    string? CustomerName,
    string? Phone,
    string? Q,
    int Page,
    int PageSize);

public sealed record CustomerOrderSummaryRow(
    Guid Id,
    string TrackingCode,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record OrderDetailsRow(
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
    IReadOnlyList<OrderItemRow> Items);

public sealed record OrderItemRow(
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
    DateTimeOffset? CurrentStatusUpdatedAt);

public sealed record OrderAuditSnapshotRow(
    string TrackingCode,
    Guid? CustomerId,
    string? AdminNotes,
    string Status,
    DateTimeOffset? ExpectedDeliveryAt,
    Guid? DeliveryAddressId,
    string? DeliveryCity,
    string? DeliveryStreet,
    string? DeliveryBuilding,
    string? DeliveryApartment,
    string? DeliveryPostalCode,
    string? DeliveryNote,
    bool IsDeleted);

public sealed record OrderItemAuditSnapshotRow(
    string Name,
    string ItemType,
    string? Description,
    int Quantity,
    decimal? UnitPrice,
    string? CurrencyCode,
    string? CurrentStatusText,
    bool IsDeleted);
