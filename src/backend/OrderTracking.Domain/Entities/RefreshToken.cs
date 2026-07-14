using OrderTracking.Domain.Common;

namespace OrderTracking.Domain.Entities;

public class RefreshToken : BaseEntity
{
    public Guid AdminUserId { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? RevokedAt { get; set; }
    public Guid? ReplacedByTokenId { get; set; }
    public string? CreatedByIp { get; set; }
    public string? UserAgent { get; set; }

    public AdminUser AdminUser { get; set; } = null!;
    public RefreshToken? ReplacedByToken { get; set; }

    public bool IsActive => RevokedAt is null && ExpiresAt > DateTimeOffset.UtcNow;
}
