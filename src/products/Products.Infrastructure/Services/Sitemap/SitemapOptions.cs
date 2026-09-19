namespace Products.Infrastructure.Services.Sitemap;

public sealed class SitemapOptions
{
    public const string SectionName = "Sitemap";

    public string PublicBaseUrl { get; set; } = "https://the-get.ru";
    public string StoragePath { get; set; } = "data/sitemaps";
    public int ProductsPerFile { get; set; } = 20_000;
    public int DatabaseBatchSize { get; set; } = 2_000;
    public long MaxUncompressedBytes { get; set; } = 40L * 1024 * 1024;
    public int MaxUrlsPerFile { get; set; } = 50_000;
    public int RegenerationIntervalMinutes { get; set; } = 60;
    public int InitialDelaySeconds { get; set; } = 10;
    public int RetainedGenerations { get; set; } = 3;
}
