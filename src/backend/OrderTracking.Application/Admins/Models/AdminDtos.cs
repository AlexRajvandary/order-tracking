using OrderTracking.Domain.Enums;

namespace OrderTracking.Application.Admins.Models;

public sealed record AdminUserDto(
    Guid Id,
    string Login,
    string? DisplayName,
    string Role,
    bool IsActive,
    bool IsOnline,
    DateTimeOffset? LastSeenAt,
    long? TelegramId,
    string? TelegramUsername,
    string? TelegramAvatarUrl,
    DateTimeOffset CreatedAt);

public sealed record CreateAdminRequest(
    string Login,
    string Password,
    string? DisplayName,
    AdminRole Role);

public sealed record UpdateAdminRequest(
    string? DisplayName,
    bool IsActive,
    AdminRole? Role);

public sealed record BindTelegramRequest(
    long Id,
    string FirstName,
    string? LastName,
    string? Username,
    string? PhotoUrl,
    long AuthDate,
    string Hash);
