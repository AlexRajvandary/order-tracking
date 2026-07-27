namespace OrderTracking.Application.Common.Persistence.Models;

public sealed record OrderTrackingPresenceRow(Guid OrderId, Guid? CustomerId);

public sealed record PublicTrackingOrderRow(
    string TrackingCode,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ExpectedDeliveryAt,
    string Status,
    IReadOnlyList<PublicTrackingItemRow> Items);

public sealed record PublicTrackingItemRow(
    string Name,
    string Type,
    int Quantity,
    string? CurrentStatus,
    string? StatusColor,
    IReadOnlyList<PublicStatusHistoryRow> History);

public sealed record PublicStatusHistoryRow(
    string StatusText,
    string? Comment,
    string? Country,
    string? Location,
    DateTimeOffset ChangedAt,
    IReadOnlyList<PublicStatusAttachmentRow> Attachments);

public sealed record PublicStatusAttachmentRow(
    Guid Id,
    string ContentType,
    string UploadedByAdminName,
    DateTimeOffset UploadedAt);
