namespace Products.Domain.Entities;

public sealed class TcgCardSpecification
{
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public string? CharacterName { get; set; }
    public string? Franchise { get; set; }
    public string? SetName { get; set; }
    public string? CardNumber { get; set; }
    public string? Rarity { get; set; }
    public string? OfficialUrl { get; set; }
    public string ShopLinksJson { get; set; } = "{}";
    public ICollection<TcgCardCharacter> Characters { get; set; } = new List<TcgCardCharacter>();
}
