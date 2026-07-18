using OrderTracking.Domain.Common;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Domain.Entities;

public class AdminUser : AuditableEntity
{
    public string Login { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public AdminRole Role { get; set; }
    public bool IsActive { get; set; } = true;

    /// <summary>Telegram user id from Login Widget (unique when set).</summary>
    public long? TelegramId { get; set; }

    public string? TelegramUsername { get; set; }

    /// <summary>Telegram profile photo URL from Login Widget (<c>photo_url</c>).</summary>
    public string? TelegramAvatarUrl { get; set; }

    /// <summary>Updated by client heartbeat while the admin session is open.</summary>
    public DateTimeOffset? LastSeenAt { get; set; }

    /// <summary>JSON user preferences (column visibility, etc.).</summary>
    public string SettingsJson { get; set; } = "{}";

    public ICollection<Order> CreatedOrders { get; set; } = [];
    public ICollection<OrderItemStatusHistory> StatusChanges { get; set; } = [];
    public ICollection<RefreshToken> RefreshTokens { get; set; } = [];
    public ICollection<AuditLogEntry> AuditLogs { get; set; } = [];
}
