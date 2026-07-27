namespace OrderTracking.Application.Common.Persistence.Models;

public sealed record StatusHistoryListRow(
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
    string ChangedByAdminName,
    DateTimeOffset ChangedAt,
    IReadOnlyList<StatusHistoryAttachmentRow> Attachments);

public sealed record StatusHistoryAttachmentRow(
    Guid Id,
    string ContentType,
    Guid UploadedByAdminId,
    string UploadedByAdminName,
    DateTimeOffset UploadedAt);

public sealed record PublishedStatusRow(
    Guid? StatusDefinitionId,
    string StatusText,
    DateTimeOffset ChangedAt);
