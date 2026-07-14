namespace OrderTracking.Application.Tracking.Models;

public sealed record PublicTrackingDto(
    string TrackingCode,
    DateTimeOffset CreatedAt,
    DateTimeOffset LastUpdatedAt,
    string? CustomerName,
    string? CustomerEmail,
    string? CustomerTelegram,
    bool OverallIsFinal,
    IReadOnlyList<PublicTrackingItemDto> Items);

public sealed record PublicTrackingItemDto(
    string Name,
    string Type,
    int Quantity,
    string? CurrentStatus,
    string? StatusColor,
    IReadOnlyList<PublicStatusHistoryDto> History);

public sealed record PublicStatusHistoryDto(
    string Status,
    string? Comment,
    DateTimeOffset ChangedAt,
    IReadOnlyList<PublicStatusAttachmentDto> Attachments);

public sealed record PublicStatusAttachmentDto(
    Guid Id,
    string Url,
    string ContentType,
    string? UploadedByAdminName,
    DateTimeOffset UploadedAt);
