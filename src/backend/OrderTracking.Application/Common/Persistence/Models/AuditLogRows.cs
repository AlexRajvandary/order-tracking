namespace OrderTracking.Application.Common.Persistence.Models;

public sealed record AuditLogDetailRow(
    Guid Id,
    string EntityType,
    Guid EntityId,
    string Action,
    Guid? AdminUserId,
    string? AdminLogin,
    string? OldValues,
    string? NewValues,
    string? IpAddress,
    string? UserAgent,
    string? CorrelationId,
    DateTimeOffset CreatedAt);

public sealed record AuditLogRecentRow(
    Guid Id,
    string EntityType,
    Guid EntityId,
    string Action,
    string? AdminLogin,
    DateTimeOffset CreatedAt,
    string? OldValues,
    string? NewValues);

public sealed record CustomerAuditSnapshotRow(
    string? LastName,
    string? FirstName,
    string? Patronymic,
    string? Telegram,
    string? Phone,
    string? WhatsApp,
    string? Vk,
    string? Email,
    string? Notes,
    bool IsDeleted);

public sealed record StatusDefinitionAuditSnapshotRow(
    string Name,
    string? ItemType,
    string? Color,
    bool IsActive,
    bool IsFinal,
    bool IsDeleted);
