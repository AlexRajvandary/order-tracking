namespace Products.Domain.Entities;

public sealed class ProductVariant
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public string? Size { get; set; }
    public decimal? Price { get; set; }
    public string? CurrencyCode { get; set; }
    public bool? IsAvailable { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
}
