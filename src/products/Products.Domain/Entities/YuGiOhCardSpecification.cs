namespace Products.Domain.Entities;

public sealed class YuGiOhCardSpecification
{
    public Guid ProductId { get; set; }
    public TcgCardSpecification Card { get; set; } = null!;

    public string? JapaneseNameReading { get; set; }
    public string? SetNameRu { get; set; }
    public string? CardType { get; set; }
    public string? CardSubtype { get; set; }
    public string? Attribute { get; set; }
    public string? StatsRaw { get; set; }
    public string? MonsterRaceRaw { get; set; }
    public string? MonsterRaceRu { get; set; }
    public string? DescriptionRu { get; set; }

    public string? SeriesMetadataRaw { get; set; }
    public string? SeriesAlternateName { get; set; }
    public string? SeriesAlternateNameRu { get; set; }
    public string? SeriesType { get; set; }
    public string? SeriesTypeRu { get; set; }
    public DateOnly? ReleaseDate { get; set; }
    public int? DeclaredCardCount { get; set; }

    public int? Level { get; set; }
    public int? Rank { get; set; }
    public int? LinkRating { get; set; }
    public int? Attack { get; set; }
    public int? Defense { get; set; }
}
