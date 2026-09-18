namespace Products.Domain.Entities;

public sealed class TcgCardSpecification
{
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public string? CharacterName { get; set; }
    public string? SetName { get; set; }
    public string? CardNumber { get; set; }
    public string ShopLinksJson { get; set; } = "{}";
}
