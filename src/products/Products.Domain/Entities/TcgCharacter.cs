namespace Products.Domain.Entities;

public sealed class TcgCharacter
{
    public Guid Id { get; set; }
    public string Franchise { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? AlternateName { get; set; }
    public ICollection<TcgCardCharacter> Cards { get; set; } = new List<TcgCardCharacter>();
    public OnePieceCharacterSpecification? OnePieceSpecification { get; set; }
}

public sealed class TcgCardCharacter
{
    public Guid ProductId { get; set; }
    public TcgCardSpecification Card { get; set; } = null!;
    public Guid CharacterId { get; set; }
    public TcgCharacter Character { get; set; } = null!;
}
