namespace Products.Domain.Entities;

public sealed class YuGiOhSet
{
    public Guid Id { get; set; }
    public string SourceKey { get; set; } = string.Empty;
    public string NameOriginal { get; set; } = string.Empty;
    public string? NameRu { get; set; }
    public string? MetadataRaw { get; set; }
    public string? AlternateNameOriginal { get; set; }
    public string? AlternateNameRu { get; set; }
    public string? ReleaseTypeCode { get; set; }
    public string? ReleaseTypeRu { get; set; }
    public DateOnly? ReleaseDate { get; set; }
    public int? DeclaredCardCount { get; set; }
    public ICollection<YuGiOhCardSpecification> Cards { get; set; } = new List<YuGiOhCardSpecification>();
}
