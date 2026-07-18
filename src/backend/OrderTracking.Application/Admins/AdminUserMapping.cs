using OrderTracking.Application.Admins.Models;
using OrderTracking.Domain.Entities;

namespace OrderTracking.Application.Admins;

public static class AdminUserMapping
{
    public static AdminUserDto ToDto(AdminUser user, DateTimeOffset utcNow) =>
        new(
            user.Id,
            user.Login,
            user.DisplayName,
            user.Role.ToString(),
            user.IsActive,
            AdminPresence.IsOnline(user.LastSeenAt, utcNow),
            user.LastSeenAt,
            user.TelegramId,
            user.TelegramUsername,
            user.TelegramAvatarUrl,
            user.CreatedAt);
}
