namespace Products.Domain.Entities;

public sealed class StorefrontAnnouncement
{
    public static readonly Guid SingletonId = Guid.Parse("00000000-0000-0000-0000-000000000001");

    public Guid Id { get; set; } = SingletonId;
    public string Text { get; set; } = string.Empty;
    public DateTimeOffset UpdatedAt { get; set; }
}
