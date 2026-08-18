namespace Products.Domain.Entities;

public sealed class CatalogFavorite
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public Guid? UserId { get; set; }
    public string? VisitorKey { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
