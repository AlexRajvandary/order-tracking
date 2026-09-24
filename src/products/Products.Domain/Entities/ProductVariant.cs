namespace Products.Domain.Entities;

public sealed class ProductVariant
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public Guid? ProductColorId { get; set; }
    public ProductColor? ProductColor { get; set; }
    public Guid? ProductSizeId { get; set; }
    public ProductSize? ProductSize { get; set; }
    public long? ExternalColorId { get; set; }
    public long? ExternalSizeId { get; set; }
    public string? Color { get; set; }
    public string? Size { get; set; }
    public decimal? Price { get; set; }
    public string? CurrencyCode { get; set; }
    public bool? IsAvailable { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
}
