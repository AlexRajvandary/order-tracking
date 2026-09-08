namespace Products.Domain.Entities;

public sealed class ExternalProductCartItem
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public string? VisitorKey { get; set; }
    public string Source { get; set; } = "Rakuten";
    public string ExternalId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal UnitPrice { get; set; }
    public string CurrencyCode { get; set; } = "JPY";
    public string? ImageUrl { get; set; }
    public string? SourceUrl { get; set; }
    public string? AffiliateUrl { get; set; }
    public string? ShopCode { get; set; }
    public string? ShopName { get; set; }
    public bool Available { get; set; }
    public int Quantity { get; set; }
    public DateTimeOffset AddedAt { get; set; }
    public DateTimeOffset LastValidatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
