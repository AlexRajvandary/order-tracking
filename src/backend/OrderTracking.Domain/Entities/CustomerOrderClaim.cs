namespace OrderTracking.Domain.Entities;

public sealed class CustomerOrderClaim
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? ClaimedAt { get; set; }
    public DateTimeOffset? TelegramNotifiedAt { get; set; }
    public Guid? ClaimedByUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
