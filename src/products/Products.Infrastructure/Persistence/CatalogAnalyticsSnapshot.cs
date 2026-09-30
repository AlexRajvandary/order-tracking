namespace Products.Infrastructure.Persistence;

public sealed class CatalogAnalyticsSnapshot
{
    public int Id { get; set; }
    public required string Payload { get; set; }
    public DateTimeOffset GeneratedAt { get; set; }
}
