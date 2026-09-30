using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Products.Infrastructure.Persistence;

namespace Products.Api.Services;

public sealed class CatalogAnalyticsCacheService(ProductsDbContext db, ILogger<CatalogAnalyticsCacheService> logger)
{
    private static readonly SemaphoreSlim RefreshLock = new(1, 1);
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private static readonly TimeSpan CacheLifetime = TimeSpan.FromDays(1);
    private const int DetailedDescriptionLength = 100;

    public async Task<CatalogAnalyticsDto> GetAsync(CancellationToken cancellationToken)
    {
        var snapshot = await db.CatalogAnalyticsSnapshots.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == 1, cancellationToken);
        var cached = Deserialize(snapshot);
        if (cached is not null && DateTimeOffset.UtcNow - snapshot!.GeneratedAt < CacheLifetime)
        {
            return cached;
        }

        try
        {
            return await RefreshAsync(force: false, cancellationToken);
        }
        catch (Exception exception) when (cached is not null && !cancellationToken.IsCancellationRequested)
        {
            logger.LogWarning(exception, "Could not refresh stale catalog analytics; returning the last saved snapshot from {GeneratedAt}", snapshot!.GeneratedAt);
            return cached;
        }
    }

    public async Task<CatalogAnalyticsDto> RefreshAsync(bool force, CancellationToken cancellationToken)
    {
        await RefreshLock.WaitAsync(cancellationToken);
        try
        {
            var snapshot = await db.CatalogAnalyticsSnapshots
                .SingleOrDefaultAsync(item => item.Id == 1, cancellationToken);
            if (!force && snapshot is not null && DateTimeOffset.UtcNow - snapshot.GeneratedAt < CacheLifetime)
            {
                var cached = JsonSerializer.Deserialize<CatalogAnalyticsDto>(snapshot.Payload, JsonOptions);
                if (cached is not null) return cached;
            }

            var result = await CalculateAsync(cancellationToken);
            var payload = JsonSerializer.Serialize(result, JsonOptions);
            if (snapshot is null)
            {
                db.CatalogAnalyticsSnapshots.Add(new CatalogAnalyticsSnapshot
                {
                    Id = 1,
                    Payload = payload,
                    GeneratedAt = result.GeneratedAt,
                });
            }
            else
            {
                snapshot.Payload = payload;
                snapshot.GeneratedAt = result.GeneratedAt;
            }

            await db.SaveChangesAsync(cancellationToken);
            return result;
        }
        finally
        {
            RefreshLock.Release();
        }
    }

    private async Task<CatalogAnalyticsDto> CalculateAsync(CancellationToken cancellationToken)
    {
        var products = await db.Products.AsNoTracking()
            .Select(product => new ProductAnalyticsRow(
                product.IsActive,
                product.CategoryId,
                product.Category == null ? null : product.Category.Name,
                product.Shop == null ? null : product.Shop.Name,
                product.Brand,
                product.CreatedAt,
                product.Description == null ? 0 : product.Description.Length,
                product.ProductImages.Count(),
                product.ProductColors.Any(),
                product.ProductSizes.Any(),
                product.ProductSizes.Any(size => size.SpecificationsJson != null),
                product.LocalImageUrl != null && product.LocalImageUrl != "",
                product.SourceDetail != null && product.SourceDetail.Material != null && product.SourceDetail.Material != "",
                product.SourceDetail == null ? null : product.SourceDetail.Availability))
            .ToListAsync(cancellationToken);

        var total = products.Count;
        var detailed = products.Count(HasDetailedDescription);
        var extraImages = products.Count(item => item.ImageCount > 1);
        var colors = products.Count(item => item.HasColors);
        var sizes = products.Count(item => item.HasSizes);
        var sizeSpecs = products.Count(item => item.HasSizeSpecifications);
        var localImages = products.Count(item => item.HasLocalImage);
        var materials = products.Count(item => item.HasMaterial);
        var enriched = products.Count(IsFullyEnriched);

        var summary = new CatalogSummaryDto(total, products.Count(item => item.IsActive), products.Count(item => !item.IsActive),
            products.Count(item => item.CategoryId != null), products.Count(item => item.CategoryId == null), enriched);
        var completeness = new CatalogCompletenessDto(DetailedDescriptionLength, detailed, extraImages, colors, sizes, sizeSpecs, localImages, materials);
        var attention = new CatalogAttentionDto(total - detailed, total - extraImages, total - colors, total - sizes,
            products.Count(item => !item.HasColors || !item.HasSizes), total - sizeSpecs, total - localImages, total - materials, total - enriched);

        var categories = products.GroupBy(item => new { item.CategoryId, item.CategoryName })
            .Select(group => new CategoryAnalyticsDto(group.Key.CategoryId, group.Key.CategoryName, group.Key.CategoryId == null,
                group.Count(), group.Count(item => item.IsActive), group.Count(HasDetailedDescription),
                group.Count(item => item.ImageCount > 1), group.Count(item => item.HasColors), group.Count(item => item.HasSizes), group.Count(IsFullyEnriched)))
            .OrderByDescending(item => item.ProductCount).ThenBy(item => item.Name).ToList();

        var availability = products.GroupBy(item => NormalizeAvailability(item.Availability))
            .Select(group => new AnalyticsBreakdownDto(group.Key, group.Count())).OrderByDescending(item => item.Count).ToList();
        var imageDepth = new[]
        {
            new AnalyticsBreakdownDto("none", products.Count(item => item.ImageCount == 0)),
            new AnalyticsBreakdownDto("one", products.Count(item => item.ImageCount == 1)),
            new AnalyticsBreakdownDto("twoToFive", products.Count(item => item.ImageCount is >= 2 and <= 5)),
            new AnalyticsBreakdownDto("sixPlus", products.Count(item => item.ImageCount >= 6)),
        };
        var topBrands = products.Where(item => !string.IsNullOrWhiteSpace(item.Brand)).GroupBy(item => item.Brand!.Trim(), StringComparer.OrdinalIgnoreCase)
            .Select(group => new AnalyticsBreakdownDto(group.Key, group.Count())).OrderByDescending(item => item.Count).ThenBy(item => item.Key).Take(10).ToList();
        var topShops = products.Where(item => !string.IsNullOrWhiteSpace(item.ShopName)).GroupBy(item => item.ShopName!.Trim(), StringComparer.OrdinalIgnoreCase)
            .Select(group => new AnalyticsBreakdownDto(group.Key, group.Count())).OrderByDescending(item => item.Count).ThenBy(item => item.Key).Take(10).ToList();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var additions = products.Where(item => DateOnly.FromDateTime(item.CreatedAt.UtcDateTime) >= today.AddDays(-29))
            .GroupBy(item => DateOnly.FromDateTime(item.CreatedAt.UtcDateTime)).ToDictionary(group => group.Key, group => group.Count());
        var recentAdditions = Enumerable.Range(0, 30).Select(offset => today.AddDays(offset - 29))
            .Select(date => new DailyProductCountDto(date.ToString("yyyy-MM-dd"), additions.GetValueOrDefault(date))).ToList();

        return new CatalogAnalyticsDto(DateTimeOffset.UtcNow, summary, completeness, attention, categories,
            availability, imageDepth, topBrands, topShops, recentAdditions);
    }

    private static bool HasDetailedDescription(ProductAnalyticsRow product) => product.DescriptionLength >= DetailedDescriptionLength;
    private static bool IsFullyEnriched(ProductAnalyticsRow product) => HasDetailedDescription(product) && product.ImageCount > 1 && product.HasColors && product.HasSizes;
    private static CatalogAnalyticsDto? Deserialize(CatalogAnalyticsSnapshot? snapshot) =>
        snapshot is null ? null : JsonSerializer.Deserialize<CatalogAnalyticsDto>(snapshot.Payload, JsonOptions);

    private static string NormalizeAvailability(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return "unknown";
        if (value.Contains("OutOfStock", StringComparison.OrdinalIgnoreCase)) return "outOfStock";
        if (value.Contains("PreOrder", StringComparison.OrdinalIgnoreCase)) return "preOrder";
        if (value.Contains("InStock", StringComparison.OrdinalIgnoreCase)) return "inStock";
        return "other";
    }

    private sealed record ProductAnalyticsRow(bool IsActive, Guid? CategoryId, string? CategoryName, string? ShopName, string? Brand,
        DateTimeOffset CreatedAt, int DescriptionLength, int ImageCount, bool HasColors, bool HasSizes,
        bool HasSizeSpecifications, bool HasLocalImage, bool HasMaterial, string? Availability);
}

public sealed record CatalogAnalyticsDto(DateTimeOffset GeneratedAt, CatalogSummaryDto Summary, CatalogCompletenessDto Completeness,
    CatalogAttentionDto Attention, IReadOnlyList<CategoryAnalyticsDto> Categories, IReadOnlyList<AnalyticsBreakdownDto> Availability,
    IReadOnlyList<AnalyticsBreakdownDto> ImageDepth, IReadOnlyList<AnalyticsBreakdownDto> TopBrands,
    IReadOnlyList<AnalyticsBreakdownDto> TopShops, IReadOnlyList<DailyProductCountDto> RecentAdditions);
public sealed record CatalogSummaryDto(int Total, int Active, int Inactive, int Categorized, int Uncategorized, int FullyEnriched);
public sealed record CatalogCompletenessDto(int DetailedDescriptionMinLength, int DetailedDescription, int AdditionalImages, int Colors,
    int Sizes, int SizeSpecifications, int LocalImage, int Material);
public sealed record CatalogAttentionDto(int MissingDetailedDescription, int MissingAdditionalImages, int MissingColors, int MissingSizes,
    int MissingOptions, int MissingSizeSpecifications, int MissingLocalImage, int MissingMaterial, int NotFullyEnriched);
public sealed record CategoryAnalyticsDto(Guid? CategoryId, string? Name, bool IsUncategorized, int ProductCount, int ActiveCount,
    int DetailedDescriptionCount, int AdditionalImagesCount, int ColorsCount, int SizesCount, int FullyEnrichedCount);
public sealed record AnalyticsBreakdownDto(string Key, int Count);
public sealed record DailyProductCountDto(string Date, int Count);
