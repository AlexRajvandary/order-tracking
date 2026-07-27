using OrderTracking.Domain.Enums;

namespace OrderTracking.Application.Common.Interfaces;

public sealed record TelegramBotAdminContext(
    Guid AdminId,
    long TelegramId,
    string Login,
    string? DisplayName,
    AdminRole Role,
    bool IsActive);
