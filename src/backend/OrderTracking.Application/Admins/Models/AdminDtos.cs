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
    DateTimeOffset CreatedAt);

public sealed record CreateAdminRequest(
    string Login,
    string Password,
    string? DisplayName);

public sealed record UpdateAdminRequest(
    string? DisplayName,
    bool IsActive);

public sealed record BindTelegramRequest(
    long Id,
    string FirstName,
    string? LastName,
    string? Username,
    string? PhotoUrl,
    long AuthDate,
    string Hash);
