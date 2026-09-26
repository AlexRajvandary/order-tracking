using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Products.Infrastructure.Persistence;

namespace Products.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/products/analytics")]
public sealed class CatalogAnalyticsController : ControllerBase
{
    private const int DetailedDescriptionLength = 100;
    private readonly ProductsDbContext _db;

    public CatalogAnalyticsController(ProductsDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<CatalogAnalyticsDto>> Get(CancellationToken cancellationToken)
    {
        var products = await _db.Products
            .AsNoTracking()
            .Select(product => new ProductAnalyticsRow(
                product.Id,
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
                product.ProductSizes.Any(size =>
                    size.SpecificationsJson != null && size.SpecificationsJson != ""),
                product.LocalImageUrl != null && product.LocalImageUrl != "",
                product.SourceDetail != null &&
                    product.SourceDetail.Material != null && product.SourceDetail.Material != "",
                product.SourceDetail == null ? null : product.SourceDetail.Availability))
            .ToListAsync(cancellationToken);

        var total = products.Count;
        var withDetailedDescription = products.Count(HasDetailedDescription);
        var withAdditionalImages = products.Count(HasAdditionalImages);
        var withColors = products.Count(product => product.HasColors);
        var withSizes = products.Count(product => product.HasSizes);
        var withSizeSpecifications = products.Count(product => product.HasSizeSpecifications);
        var withLocalImage = products.Count(product => product.HasLocalImage);
        var withMaterial = products.Count(product => product.HasMaterial);
        var fullyEnriched = products.Count(IsFullyEnriched);

        var summary = new CatalogSummaryDto(
            total,
            products.Count(product => product.IsActive),
            products.Count(product => !product.IsActive),
            products.Count(product => product.CategoryId != null),
            products.Count(product => product.CategoryId == null),
            fullyEnriched);

        var completeness = new CatalogCompletenessDto(
            DetailedDescriptionLength,
            withDetailedDescription,
            withAdditionalImages,
            withColors,
            withSizes,
            withSizeSpecifications,
            withLocalImage,
            withMaterial);

        var attention = new CatalogAttentionDto(
            total - withDetailedDescription,
            total - withAdditionalImages,
            total - withColors,
            total - withSizes,
            products.Count(product => !product.HasColors || !product.HasSizes),
            total - withSizeSpecifications,
            total - withLocalImage,
            total - withMaterial,
            total - fullyEnriched);

        var categories = products
            .GroupBy(product => new { product.CategoryId, product.CategoryName })
            .Select(group => new CategoryAnalyticsDto(
                group.Key.CategoryId,
                group.Key.CategoryName,
                group.Key.CategoryId == null,
                group.Count(),
                group.Count(product => product.IsActive),
                group.Count(HasDetailedDescription),
                group.Count(HasAdditionalImages),
                group.Count(product => product.HasColors),
                group.Count(product => product.HasSizes),
                group.Count(IsFullyEnriched)))
            .OrderByDescending(category => category.ProductCount)
            .ThenBy(category => category.Name)
            .ToList();

        var availability = products
            .GroupBy(product => NormalizeAvailability(product.Availability))
            .Select(group => new AnalyticsBreakdownDto(group.Key, group.Count()))
            .OrderByDescending(item => item.Count)
            .ToList();

        var imageDepth = new[]
        {
            new AnalyticsBreakdownDto("none", products.Count(product => product.ImageCount == 0)),
            new AnalyticsBreakdownDto("one", products.Count(product => product.ImageCount == 1)),
            new AnalyticsBreakdownDto("twoToFive", products.Count(product => product.ImageCount is >= 2 and <= 5)),
            new AnalyticsBreakdownDto("sixPlus", products.Count(product => product.ImageCount >= 6)),
        };

        var topBrands = products
            .Where(product => !string.IsNullOrWhiteSpace(product.Brand))
            .GroupBy(product => product.Brand!.Trim(), StringComparer.OrdinalIgnoreCase)
            .Select(group => new AnalyticsBreakdownDto(group.Key, group.Count()))
            .OrderByDescending(item => item.Count)
            .ThenBy(item => item.Key)
            .Take(10)
            .ToList();

        var topShops = products
            .Where(product => !string.IsNullOrWhiteSpace(product.ShopName))
            .GroupBy(product => product.ShopName!.Trim(), StringComparer.OrdinalIgnoreCase)
            .Select(group => new AnalyticsBreakdownDto(group.Key, group.Count()))
            .OrderByDescending(item => item.Count)
            .ThenBy(item => item.Key)
            .Take(10)
            .ToList();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var additionsByDate = products
            .Where(product => DateOnly.FromDateTime(product.CreatedAt.UtcDateTime) >= today.AddDays(-29))
            .GroupBy(product => DateOnly.FromDateTime(product.CreatedAt.UtcDateTime))
            .ToDictionary(group => group.Key, group => group.Count());
        var recentAdditions = Enumerable.Range(0, 30)
            .Select(offset => today.AddDays(offset - 29))
            .Select(date => new DailyProductCountDto(
                date.ToString("yyyy-MM-dd"),
                additionsByDate.GetValueOrDefault(date)))
            .ToList();

        return new CatalogAnalyticsDto(
            DateTimeOffset.UtcNow,
            summary,
            completeness,
            attention,
            categories,
            availability,
            imageDepth,
            topBrands,
            topShops,
            recentAdditions);
    }

    private static bool HasDetailedDescription(ProductAnalyticsRow product) =>
        product.DescriptionLength >= DetailedDescriptionLength;

    private static bool HasAdditionalImages(ProductAnalyticsRow product) => product.ImageCount > 1;

    private static bool IsFullyEnriched(ProductAnalyticsRow product) =>
        HasDetailedDescription(product) && HasAdditionalImages(product) &&
        product.HasColors && product.HasSizes;

    private static string NormalizeAvailability(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return "unknown";
        if (value.Contains("OutOfStock", StringComparison.OrdinalIgnoreCase)) return "outOfStock";
        if (value.Contains("PreOrder", StringComparison.OrdinalIgnoreCase)) return "preOrder";
        if (value.Contains("InStock", StringComparison.OrdinalIgnoreCase)) return "inStock";
        return "other";
    }

    private sealed record ProductAnalyticsRow(
        Guid Id,
        bool IsActive,
        Guid? CategoryId,
        string? CategoryName,
        string? ShopName,
        string? Brand,
        DateTimeOffset CreatedAt,
        int DescriptionLength,
        int ImageCount,
        bool HasColors,
        bool HasSizes,
        bool HasSizeSpecifications,
        bool HasLocalImage,
        bool HasMaterial,
        string? Availability);
}

public sealed record CatalogAnalyticsDto(
    DateTimeOffset GeneratedAt,
    CatalogSummaryDto Summary,
    CatalogCompletenessDto Completeness,
    CatalogAttentionDto Attention,
    IReadOnlyList<CategoryAnalyticsDto> Categories,
    IReadOnlyList<AnalyticsBreakdownDto> Availability,
    IReadOnlyList<AnalyticsBreakdownDto> ImageDepth,
    IReadOnlyList<AnalyticsBreakdownDto> TopBrands,
    IReadOnlyList<AnalyticsBreakdownDto> TopShops,
    IReadOnlyList<DailyProductCountDto> RecentAdditions);

public sealed record CatalogSummaryDto(
    int Total,
    int Active,
    int Inactive,
    int Categorized,
    int Uncategorized,
    int FullyEnriched);

public sealed record CatalogCompletenessDto(
    int DetailedDescriptionMinLength,
    int DetailedDescription,
    int AdditionalImages,
    int Colors,
    int Sizes,
    int SizeSpecifications,
    int LocalImage,
    int Material);

public sealed record CatalogAttentionDto(
    int MissingDetailedDescription,
    int MissingAdditionalImages,
    int MissingColors,
    int MissingSizes,
    int MissingOptions,
    int MissingSizeSpecifications,
    int MissingLocalImage,
    int MissingMaterial,
    int NotFullyEnriched);

public sealed record CategoryAnalyticsDto(
    Guid? CategoryId,
    string? Name,
    bool IsUncategorized,
    int ProductCount,
    int ActiveCount,
    int DetailedDescriptionCount,
    int AdditionalImagesCount,
    int ColorsCount,
    int SizesCount,
    int FullyEnrichedCount);

public sealed record AnalyticsBreakdownDto(string Key, int Count);

public sealed record DailyProductCountDto(string Date, int Count);
