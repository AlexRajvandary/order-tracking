namespace Products.Domain.Entities;

public sealed class CatalogCartItem
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public Guid? UserId { get; set; }
    public string? VisitorKey { get; set; }
    public string SelectedColor { get; set; } = string.Empty;
    public string SelectedSize { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
