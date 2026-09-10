using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Products.Application.Common.Interfaces;
using Products.Domain.Entities;
using Products.Domain.Enums;
using Products.Application.Products.Models;

namespace Products.Infrastructure.Persistence.Repositories;

public sealed class ProductRepository : IProductRepository
{
    private static readonly TimeSpan MixedCandidatesCacheDuration = TimeSpan.FromMinutes(5);

    private static readonly SemaphoreSlim MixedCandidatesCacheLock = new(1, 1);

    private readonly ProductsDbContext _db;

    private readonly IMemoryCache _cache;

    public ProductRepository(ProductsDbContext db, IMemoryCache cache)
    {
        _db = db;
        _cache = cache;
    }

    public async Task<(IReadOnlyDictionary<Guid, int> ByCategory, int Total)> CountByCategoryAsync(
        bool? activeOnly,
        CancellationToken cancellationToken = default)
    {
        var query = _db.Products.AsNoTracking().AsQueryable();
        if (activeOnly.HasValue)
        {
            query = query.Where(product => product.IsActive == activeOnly.Value);
        }

        var groups = await query
            .GroupBy(product => product.CategoryId)
            .Select(group => new { CategoryId = group.Key, Count = group.Count() })
            .ToListAsync(cancellationToken);

        var byCategory = groups
            .Where(item => item.CategoryId.HasValue)
            .ToDictionary(item => item.CategoryId!.Value, item => item.Count);

        return (byCategory, groups.Sum(item => item.Count));
    }

    public Task<Product?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _db.Products
            .Include(p => p.Shop)
            .Include(p => p.BrandEntity)
            .Include(p => p.Category)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

    public Task<Product?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default) =>
        _db.Products
            .Include(p => p.Shop)
            .Include(p => p.BrandEntity)
            .Include(p => p.Category)
            .FirstOrDefaultAsync(p => p.Slug == slug, cancellationToken);

    public Task<bool> IsSlugTakenAsync(
        string slug,
        Guid? excludeId = null,
        CancellationToken cancellationToken = default)
    {
        var query = _db.Products.Where(p => p.Slug == slug);
        if (excludeId is not null)
        {
            query = query.Where(p => p.Id != excludeId);
        }

        return query.AnyAsync(cancellationToken);
    }

    public Task<bool> IsSkuTakenAsync(
        string sku,
        CancellationToken cancellationToken = default) =>
        _db.Products.AnyAsync(p => p.Sku == sku, cancellationToken);

    public async Task<(IReadOnlyList<Product> Items, int Total)> SearchAsync(
        string? search,
        bool? activeOnly,
        IReadOnlyList<Guid>? brandIds,
        IReadOnlyList<string>? brandSlugs,
        IReadOnlyList<Guid>? shopIds,
        IReadOnlyList<string>? shopSlugs,
        IReadOnlyList<ProductCondition>? conditions,
        Guid? categoryId,
        string? categorySlug,
        bool includeCategoryChildren,
        decimal? priceMin,
        decimal? priceMax,
        int page,
        int pageSize,
        bool mixCategories,
        int shuffleSeed,
        CancellationToken cancellationToken = default)
    {
        var query = await BuildFilterQueryAsync(
            search,
            activeOnly,
            brandIds,
            brandSlugs,
            shopIds,
            shopSlugs,
            conditions,
            categoryId,
            categorySlug,
            includeCategoryChildren,
            priceMin,
            priceMax,
            cancellationToken);

        if (mixCategories)
        {
            return await SearchMixedAsync(
                query,
                BuildMixedCandidatesCacheKey(
                    search,
                    activeOnly,
                    brandIds,
                    brandSlugs,
                    shopIds,
                    shopSlugs,
                    conditions,
                    categoryId,
                    categorySlug,
                    includeCategoryChildren,
                    priceMin,
                    priceMax),
                page,
                pageSize,
                shuffleSeed,
                cancellationToken);
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .Include(p => p.Shop)
            .Include(p => p.BrandEntity)
            .Include(p => p.Category)
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, total);
    }

    private async Task<(IReadOnlyList<Product> Items, int Total)> SearchMixedAsync(
        IQueryable<Product> query,
        string candidatesCacheKey,
        int page,
        int pageSize,
        int shuffleSeed,
        CancellationToken cancellationToken)
    {
        var candidates = await GetMixedCandidatesAsync(
            query,
            candidatesCacheKey,
            cancellationToken);

        var orderedIds = BuildMixedProductOrder(candidates, shuffleSeed);
        var pageIds = orderedIds
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        if (pageIds.Count == 0)
        {
            return ([], candidates.Count);
        }

        var pageIdSet = pageIds.ToHashSet();
        var products = await query
            .Where(product => pageIdSet.Contains(product.Id))
            .Include(product => product.Shop)
            .Include(product => product.BrandEntity)
            .Include(product => product.Category)
            .ToListAsync(cancellationToken);
        var productsById = products.ToDictionary(product => product.Id);

        return (
            pageIds
                .Where(productsById.ContainsKey)
                .Select(id => productsById[id])
                .ToList(),
            candidates.Count);
    }

    private async Task<IReadOnlyList<MixedProductCandidate>> GetMixedCandidatesAsync(
        IQueryable<Product> query,
        string cacheKey,
        CancellationToken cancellationToken)
    {
        if (_cache.TryGetValue(cacheKey, out IReadOnlyList<MixedProductCandidate>? cached)
            && cached is not null)
        {
            return cached;
        }

        await MixedCandidatesCacheLock.WaitAsync(cancellationToken);
        try
        {
            if (_cache.TryGetValue(cacheKey, out cached) && cached is not null)
            {
                return cached;
            }

            IReadOnlyList<MixedProductCandidate> candidates = await query
                .OrderBy(product => product.Id)
                .Select(product => new MixedProductCandidate(product.Id, product.CategoryId))
                .ToListAsync(cancellationToken);

            _cache.Set(
                cacheKey,
                candidates,
                new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = MixedCandidatesCacheDuration,
                    Size = Math.Max(1, candidates.Count),
                });

            return candidates;
        }
        finally
        {
            MixedCandidatesCacheLock.Release();
        }
    }

    private static string BuildMixedCandidatesCacheKey(
        string? search,
        bool? activeOnly,
        IReadOnlyList<Guid>? brandIds,
        IReadOnlyList<string>? brandSlugs,
        IReadOnlyList<Guid>? shopIds,
        IReadOnlyList<string>? shopSlugs,
        IReadOnlyList<ProductCondition>? conditions,
        Guid? categoryId,
        string? categorySlug,
        bool includeCategoryChildren,
        decimal? priceMin,
        decimal? priceMax)
    {
        var parts = new[]
        {
            "products:mixed-candidates:v1",
            CachePart(search?.Trim()),
            CachePart(activeOnly?.ToString()),
            CachePart(JoinCacheValues(brandIds)),
            CachePart(JoinCacheValues(brandSlugs, value => value.Trim().ToLowerInvariant())),
            CachePart(JoinCacheValues(shopIds)),
            CachePart(JoinCacheValues(shopSlugs, value => value.Trim().ToLowerInvariant())),
            CachePart(JoinCacheValues(conditions)),
            CachePart(categoryId?.ToString("D")),
            CachePart(categorySlug?.Trim().ToLowerInvariant()),
            CachePart(includeCategoryChildren.ToString()),
            CachePart(priceMin?.ToString(System.Globalization.CultureInfo.InvariantCulture)),
            CachePart(priceMax?.ToString(System.Globalization.CultureInfo.InvariantCulture)),
        };

        return string.Join('|', parts);
    }

    private static string? JoinCacheValues<T>(
        IReadOnlyList<T>? values,
        Func<T, string>? formatter = null)
    {
        if (values is not { Count: > 0 })
        {
            return null;
        }

        formatter ??= value => value is null ? string.Empty : value.ToString() ?? string.Empty;
        return string.Join(',', values.Select(formatter).Order(StringComparer.Ordinal));
    }

    private static string CachePart(string? value)
    {
        return value is null ? "-" : $"{value.Length}:{value}";
    }

    private static IReadOnlyList<Guid> BuildMixedProductOrder(
        IReadOnlyList<MixedProductCandidate> candidates,
        int shuffleSeed)
    {
        var random = new Random(shuffleSeed);
        var categoryGroups = candidates
            .GroupBy(candidate => candidate.CategoryId)
            .OrderBy(group => group.Key?.ToString() ?? string.Empty)
            .Select(group => group.Select(candidate => candidate.Id).ToList())
            .ToList();

        foreach (var group in categoryGroups)
        {
            Shuffle(group, random);
        }

        Shuffle(categoryGroups, random);

        var result = new List<Guid>(candidates.Count);
        for (var itemIndex = 0; result.Count < candidates.Count; itemIndex++)
        {
            foreach (var group in categoryGroups)
            {
                if (itemIndex < group.Count)
                {
                    result.Add(group[itemIndex]);
                }
            }
        }

        return result;
    }

    private static void Shuffle<T>(IList<T> items, Random random)
    {
        for (var index = items.Count - 1; index > 0; index--)
        {
            var swapIndex = random.Next(index + 1);
            (items[index], items[swapIndex]) = (items[swapIndex], items[index]);
        }
    }

    private sealed record MixedProductCandidate(Guid Id, Guid? CategoryId);

    public async Task<int> SetIsActiveAsync(
        bool isActive,
        IReadOnlyList<Guid>? productIds,
        string? search,
        bool? activeOnly,
        IReadOnlyList<string>? brandSlugs,
        IReadOnlyList<string>? shopSlugs,
        IReadOnlyList<ProductCondition>? conditions,
        Guid? categoryId,
        string? categorySlug,
        bool includeCategoryChildren,
        decimal? priceMin,
        decimal? priceMax,
        bool matchFilters,
        CancellationToken cancellationToken = default)
    {
        IQueryable<Product> query;
        if (productIds is { Count: > 0 })
        {
            var ids = productIds.Distinct().ToList();
            query = _db.Products.Where(p => ids.Contains(p.Id));
        }
        else if (matchFilters
                 || categoryId.HasValue
                 || !string.IsNullOrWhiteSpace(categorySlug))
        {
            query = await BuildFilterQueryAsync(
                search,
                activeOnly,
                brandIds: null,
                brandSlugs,
                shopIds: null,
                shopSlugs,
                conditions,
                categoryId,
                categorySlug,
                includeCategoryChildren,
                priceMin,
                priceMax,
                cancellationToken);
        }
        else
        {
            return 0;
        }

        query = query.Where(p => p.IsActive != isActive);

        var now = DateTimeOffset.UtcNow;
        return await query.ExecuteUpdateAsync(
            setters => setters
                .SetProperty(p => p.IsActive, isActive)
                .SetProperty(p => p.UpdatedAt, now),
            cancellationToken);
    }

    public async Task<int> BulkUpdateRelationsAsync(
        IReadOnlyList<Guid>? productIds,
        string? search,
        bool? activeOnly,
        IReadOnlyList<string>? brandSlugs,
        IReadOnlyList<string>? shopSlugs,
        IReadOnlyList<ProductCondition>? conditions,
        Guid? categoryId,
        string? categorySlug,
        bool includeCategoryChildren,
        decimal? priceMin,
        decimal? priceMax,
        bool matchFilters,
        bool updateCategory,
        Guid? newCategoryId,
        bool updateShop,
        Guid? newShopId,
        CancellationToken cancellationToken = default)
    {
        IQueryable<Product> query;
        if (productIds is { Count: > 0 })
        {
            var ids = productIds.Distinct().ToList();
            query = _db.Products.Where(p => ids.Contains(p.Id));
        }
        else if (matchFilters)
        {
            query = await BuildFilterQueryAsync(
                search, activeOnly, null, brandSlugs, null, shopSlugs, conditions,
                categoryId, categorySlug, includeCategoryChildren, priceMin, priceMax,
                cancellationToken);
        }
        else
        {
            return 0;
        }

        var now = DateTimeOffset.UtcNow;
        if (updateCategory && updateShop)
        {
            return await query.ExecuteUpdateAsync(setters => setters
                .SetProperty(p => p.CategoryId, newCategoryId)
                .SetProperty(p => p.ShopId, newShopId)
                .SetProperty(p => p.UpdatedAt, now), cancellationToken);
        }
        if (updateCategory)
        {
            return await query.ExecuteUpdateAsync(setters => setters
                .SetProperty(p => p.CategoryId, newCategoryId)
                .SetProperty(p => p.UpdatedAt, now), cancellationToken);
        }
        return await query.ExecuteUpdateAsync(setters => setters
            .SetProperty(p => p.ShopId, newShopId)
            .SetProperty(p => p.UpdatedAt, now), cancellationToken);
    }

    public Task<int> ClearCategoryAsync(
        IReadOnlyCollection<Guid> categoryIds,
        CancellationToken cancellationToken = default)
    {
        var ids = categoryIds.Distinct().ToList();
        var now = DateTimeOffset.UtcNow;
        return _db.Products
            .Where(product => product.CategoryId.HasValue && ids.Contains(product.CategoryId.Value))
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(product => product.CategoryId, (Guid?)null)
                .SetProperty(product => product.UpdatedAt, now), cancellationToken);
    }

    private async Task<IQueryable<Product>> BuildFilterQueryAsync(
        string? search,
        bool? activeOnly,
        IReadOnlyList<Guid>? brandIds,
        IReadOnlyList<string>? brandSlugs,
        IReadOnlyList<Guid>? shopIds,
        IReadOnlyList<string>? shopSlugs,
        IReadOnlyList<ProductCondition>? conditions,
        Guid? categoryId,
        string? categorySlug,
        bool includeCategoryChildren,
        decimal? priceMin,
        decimal? priceMax,
        CancellationToken cancellationToken)
    {
        var query = _db.Products.AsNoTracking().AsQueryable();

        if (activeOnly == true)
        {
            query = query.Where(p => p.IsActive);
        }
        else if (activeOnly == false)
        {
            query = query.Where(p => !p.IsActive);
        }

        if (brandIds is { Count: > 0 })
        {
            query = query.Where(p => p.BrandId != null && brandIds.Contains(p.BrandId.Value));
        }
        else if (brandSlugs is { Count: > 0 })
        {
            var slugs = brandSlugs
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Select(s => s.Trim().ToLower())
                .Distinct()
                .ToList();
            if (slugs.Count > 0)
            {
                query = query.Where(p =>
                    p.BrandEntity != null && slugs.Contains(p.BrandEntity.Slug.ToLower()));
            }
        }

        if (shopIds is { Count: > 0 })
        {
            query = query.Where(p => p.ShopId != null && shopIds.Contains(p.ShopId.Value));
        }
        else if (shopSlugs is { Count: > 0 })
        {
            var slugs = shopSlugs
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Select(s => s.Trim().ToLower())
                .Distinct()
                .ToList();
            if (slugs.Count > 0)
            {
                query = query.Where(p =>
                    p.Shop != null && slugs.Contains(p.Shop.Slug.ToLower()));
            }
        }

        if (conditions is { Count: > 0 })
        {
            query = query.Where(p => conditions.Contains(p.Condition));
        }

        if (categoryId is { } catId)
        {
            if (includeCategoryChildren)
            {
                var categoryIds = await _db.Categories
                    .AsNoTracking()
                    .Where(c => c.Id == catId || c.ParentId == catId)
                    .Select(c => c.Id)
                    .ToListAsync(cancellationToken);
                query = query.Where(p =>
                    p.CategoryId != null && categoryIds.Contains(p.CategoryId.Value));
            }
            else
            {
                query = query.Where(p => p.CategoryId == catId);
            }
        }
        else if (!string.IsNullOrWhiteSpace(categorySlug))
        {
            var slug = categorySlug.Trim().ToLower();
            var matched = await _db.Categories
                .AsNoTracking()
                .Where(c => c.Slug.ToLower() == slug)
                .Select(c => new { c.Id, c.ParentId })
                .FirstOrDefaultAsync(cancellationToken);

            if (matched is null)
            {
                query = query.Where(_ => false);
            }
            else
            {
                var expandChildren = includeCategoryChildren || matched.ParentId is null;
                if (expandChildren)
                {
                    var categoryIds = await _db.Categories
                        .AsNoTracking()
                        .Where(c => c.Id == matched.Id || c.ParentId == matched.Id)
                        .Select(c => c.Id)
                        .ToListAsync(cancellationToken);
                    query = query.Where(p =>
                        p.CategoryId != null && categoryIds.Contains(p.CategoryId.Value));
                }
                else
                {
                    query = query.Where(p => p.CategoryId == matched.Id);
                }
            }
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(p =>
                p.Name.ToLower().Contains(term)
                || (p.Brand != null && p.Brand.ToLower().Contains(term))
                || (p.Sku != null && p.Sku.ToLower().Contains(term))
                || (p.Description != null && p.Description.ToLower().Contains(term))
                || p.Slug.ToLower().Contains(term));
        }

        if (priceMin is { } min)
        {
            query = query.Where(p => p.Price >= min);
        }

        if (priceMax is { } max)
        {
            query = query.Where(p => p.Price <= max);
        }

        return query;
    }

    public async Task<(IReadOnlyList<Brand> Brands, IReadOnlyList<Shop> Shops)> ListFacetsAsync(
        Guid? categoryId,
        string? categorySlug,
        bool includeCategoryChildren,
        bool? activeOnly,
        CancellationToken cancellationToken = default)
    {
        var query = await BuildFilterQueryAsync(
            null, activeOnly, null, null, null, null, null, categoryId,
            categorySlug, includeCategoryChildren, null, null, cancellationToken);

        var brandIds = await query
            .Where(product => product.BrandId != null)
            .Select(product => product.BrandId!.Value)
            .Distinct()
            .ToListAsync(cancellationToken);
        var shopIds = await query
            .Where(product => product.ShopId != null)
            .Select(product => product.ShopId!.Value)
            .Distinct()
            .ToListAsync(cancellationToken);

        var brands = await _db.Brands.AsNoTracking()
            .Where(brand => brand.IsActive && brandIds.Contains(brand.Id))
            .OrderBy(brand => brand.SortOrder)
            .ThenBy(brand => brand.Name)
            .ToListAsync(cancellationToken);
        var shops = await _db.Shops.AsNoTracking()
            .Where(shop => shop.IsActive && shopIds.Contains(shop.Id))
            .OrderBy(shop => shop.SortOrder)
            .ThenBy(shop => shop.Name)
            .ToListAsync(cancellationToken);

        return (brands, shops);
    }

    public void Add(Product product) => _db.Products.Add(product);

    public void Remove(Product product) => _db.Products.Remove(product);

    public async Task<IReadOnlyList<ProductTranslationPendingDto>> GetPendingTranslationsAsync(int limit, CancellationToken cancellationToken = default) =>
        await _db.Products.AsNoTracking()
            .Where(p => p.NameRu == null || p.NameRu == "")
            .OrderBy(p => p.Id)
            .Select(p => new ProductTranslationPendingDto(p.Id, p.Name))
            .Take(limit)
            .ToListAsync(cancellationToken);

    public async Task<ProductTranslationStatsDto> GetTranslationStatsAsync(CancellationToken cancellationToken = default)
    {
        var total = await _db.Products.LongCountAsync(cancellationToken);
        var translated = await _db.Products.LongCountAsync(p => p.NameRu != null && p.NameRu != "", cancellationToken);
        return new ProductTranslationStatsDto(total, translated, total - translated);
    }

    public async Task<(int Updated, int NotFound)> SaveTranslationsAsync(IReadOnlyDictionary<Guid, string> translations, CancellationToken cancellationToken = default)
    {
        var ids = translations.Keys.ToList();
        var products = await _db.Products.Where(p => ids.Contains(p.Id)).ToListAsync(cancellationToken);
        var now = DateTimeOffset.UtcNow;
        foreach (var product in products)
        {
            if (translations.TryGetValue(product.Id, out var value))
            {
                product.NameRu = value;
                product.UpdatedAt = now;
            }
        }
        return (products.Count, ids.Count - products.Count);
    }
}
