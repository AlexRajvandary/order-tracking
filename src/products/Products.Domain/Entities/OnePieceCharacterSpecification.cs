namespace Products.Domain.Entities;

public sealed class OnePieceCharacterSpecification
{
    public Guid CharacterId { get; set; }
    public TcgCharacter Character { get; set; } = null!;
    public string? Crew { get; set; }
    public string? DevilFruit { get; set; }
    public string? Role { get; set; }
    public string? FirstAppearance { get; set; }
}
