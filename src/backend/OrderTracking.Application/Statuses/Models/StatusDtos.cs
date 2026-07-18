using OrderTracking.Domain.Enums;

namespace OrderTracking.Application.Statuses.Models;

public sealed record StatusDefinitionDto(
    Guid Id,
    string Name,
    string? ItemType,
    string? Color,
    string? DefaultCountry,
    string? DefaultLocation,
    int? PublishAfterDays,
    int SortOrder,
    bool IsActive,
    bool IsFinal,
    DateTimeOffset CreatedAt);

public sealed record StatusHistoryAttachmentDto(
    Guid Id,
    string Url,
    string ContentType,
    Guid UploadedByAdminId,
    string? UploadedByAdminName,
    DateTimeOffset UploadedAt);

public sealed record StatusHistoryEntryDto(
    Guid Id,
    Guid OrderItemId,
    string OrderItemName,
    string OrderItemType,
    Guid? StatusDefinitionId,
    string StatusText,
    string? StatusColor,
    string? Comment,
    string? Country,
    string? Location,
    DateTimeOffset? PublishAt,
    bool IsPublished,
    Guid ChangedByAdminId,
    string? ChangedByAdminName,
    DateTimeOffset ChangedAt,
    IReadOnlyList<StatusHistoryAttachmentDto> Attachments);
