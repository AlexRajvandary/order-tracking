namespace Products.Infrastructure.Services.Sitemap;

public sealed record ProductSitemapEntry(Guid Id, string Slug, DateTimeOffset LastModified);

public sealed record CategorySitemapEntry(
    Guid Id,
    Guid? ParentId,
    string Slug,
    DateTimeOffset LastModified,
    int DirectProductCount);

public sealed record SitemapFileInfo(
    string FileName,
    int UrlCount,
    long Bytes,
    DateTimeOffset LastModified);

public sealed record SitemapGenerationManifest(
    string GenerationId,
    DateTimeOffset GeneratedAt,
    int ProductCount,
    int ProductSitemapCount,
    int CategoryCount,
    int TotalUrls,
    long TotalBytes,
    int DatabaseBatchCount,
    long DurationMs,
    IReadOnlyList<SitemapFileInfo> Files);

public sealed record SitemapGenerationStatus(
    DateTimeOffset? LastSuccessfulGeneration,
    DateTimeOffset? LastAttempt,
    bool IsGenerating,
    bool IsQueued,
    int ProductCount,
    int ProductSitemapCount,
    int TotalUrls,
    long TotalBytes,
    int DatabaseBatchCount,
    long? DurationMs,
    string? LastError);

public sealed record SitemapStoredFile(
    FileStream Stream,
    long Length,
    DateTimeOffset LastModified,
    string ETag);
