using OrderTracking.Domain.Common;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Domain.Entities;

public class TelegramOutboxMessage : BaseEntity
{
    public string Kind { get; set; } = string.Empty;
    public string PayloadJson { get; set; } = "{}";
    public TelegramOutboxStatus Status { get; set; } = TelegramOutboxStatus.Pending;
    /// <summary>
    /// Dedup key for retry-safe notifications. Unique among Pending/Processing.
    /// </summary>
    public string? DedupKey { get; set; }
    public int AttemptCount { get; set; }
    public string? LastError { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? LockedAt { get; set; }
    public DateTimeOffset? ProcessedAt { get; set; }
}
