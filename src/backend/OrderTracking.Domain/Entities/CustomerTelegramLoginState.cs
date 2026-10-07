namespace OrderTracking.Domain.Entities;

public sealed class CustomerTelegramLoginState
{
    public Guid Id { get; set; }
    public string StateHash { get; set; } = string.Empty;
    public string Nonce { get; set; } = string.Empty;
    public string CodeVerifier { get; set; } = string.Empty;
    public string Purpose { get; set; } = string.Empty;
    public Guid? UserId { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? UsedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
