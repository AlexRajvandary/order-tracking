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

    private static long _mixedCandidatesCacheVersion;

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
            .Include(p => p.LaptopSpecification)
            .Include(p => p.TcgCardSpecification)!
                .ThenInclude(x => x!.Characters)
                    .ThenInclude(x => x.Character)
                        .ThenInclude(x => x.OnePieceSpecification)
            .Include(p => p.TcgCardSpecification)!
                .ThenInclude(x => x!.YuGiOhSpecification)
                    .ThenInclude(x => x!.Set)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

    public Task<Product?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default) =>
        _db.Products
            .Include(p => p.Shop)
            .Include(p => p.BrandEntity)
            .Include(p => p.Category)
            .Include(p => p.LaptopSpecification)
            .Include(p => p.TcgCardSpecification)!
                .ThenInclude(x => x!.Characters)
                    .ThenInclude(x => x.Character)
                        .ThenInclude(x => x.OnePieceSpecification)
            .Include(p => p.TcgCardSpecification)!
                .ThenInclude(x => x!.YuGiOhSpecification)
                    .ThenInclude(x => x!.Set)
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
        IReadOnlyList<ProductGender>? genders,
        Guid? categoryId,
        string? categorySlug,
        bool includeCategoryChildren,
        decimal? priceMin,
        decimal? priceMax,
        LaptopFilterCriteria? laptopFilters,
        IReadOnlyList<string>? tcgCharacters,
        IReadOnlyList<string>? tcgSets,
        IReadOnlyList<string>? tcgRarities,
        IReadOnlyList<string>? tcgCrews,
        YuGiOhFilterCriteria? yuGiOhFilters,
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

        if (genders is { Count: > 0 })
            query = query.Where(product => product.Gender.HasValue && genders.Contains(product.Gender.Value));

        query = ApplyLaptopFilters(query, laptopFilters);
        query = ApplyTcgFilters(query, tcgCharacters, tcgSets, tcgRarities, tcgCrews);
        query = ApplyYuGiOhFilters(query, yuGiOhFilters);

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
                    genders,
                    categoryId,
                    categorySlug,
                    includeCategoryChildren,
                    priceMin,
                    priceMax,
                    laptopFilters,
                    tcgCharacters,
                    tcgSets,
                    tcgRarities,
                    tcgCrews,
                    yuGiOhFilters),
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
            .Include(p => p.LaptopSpecification)
            .Include(p => p.TcgCardSpecification)!
                .ThenInclude(x => x!.Characters)
                    .ThenInclude(x => x.Character)
                        .ThenInclude(x => x.OnePieceSpecification)
            .Include(p => p.TcgCardSpecification)!
                .ThenInclude(x => x!.YuGiOhSpecification)
                    .ThenInclude(x => x!.Set)
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
            .Include(product => product.LaptopSpecification)
            .Include(product => product.TcgCardSpecification)!
                .ThenInclude(x => x!.Characters)
                    .ThenInclude(x => x.Character)
                        .ThenInclude(x => x.OnePieceSpecification)
            .Include(product => product.TcgCardSpecification)!
                .ThenInclude(x => x!.YuGiOhSpecification)
                    .ThenInclude(x => x!.Set)
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
        IReadOnlyList<ProductGender>? genders,
        Guid? categoryId,
        string? categorySlug,
        bool includeCategoryChildren,
        decimal? priceMin,
        decimal? priceMax,
        LaptopFilterCriteria? laptopFilters,
        IReadOnlyList<string>? tcgCharacters,
        IReadOnlyList<string>? tcgSets,
        IReadOnlyList<string>? tcgRarities,
        IReadOnlyList<string>? tcgCrews,
        YuGiOhFilterCriteria? yuGiOhFilters)
    {
        var parts = new[]
        {
            "products:mixed-candidates:v1",
            Volatile.Read(ref _mixedCandidatesCacheVersion).ToString(),
            CachePart(search?.Trim()),
            CachePart(activeOnly?.ToString()),
            CachePart(JoinCacheValues(brandIds)),
            CachePart(JoinCacheValues(brandSlugs, value => value.Trim().ToLowerInvariant())),
            CachePart(JoinCacheValues(shopIds)),
            CachePart(JoinCacheValues(shopSlugs, value => value.Trim().ToLowerInvariant())),
            CachePart(JoinCacheValues(conditions)),
            CachePart(JoinCacheValues(genders)),
            CachePart(categoryId?.ToString("D")),
            CachePart(categorySlug?.Trim().ToLowerInvariant()),
            CachePart(includeCategoryChildren.ToString()),
            CachePart(priceMin?.ToString(System.Globalization.CultureInfo.InvariantCulture)),
            CachePart(priceMax?.ToString(System.Globalization.CultureInfo.InvariantCulture)),
            CachePart(JoinCacheValues(laptopFilters?.Models)),
            CachePart(JoinCacheValues(laptopFilters?.Processors)),
            CachePart(JoinCacheValues(laptopFilters?.RamGb)),
            CachePart(JoinCacheValues(laptopFilters?.StorageTypes)),
            CachePart(JoinCacheValues(laptopFilters?.StorageGb)),
            CachePart(JoinCacheValues(laptopFilters?.ScreenSizes)),
            CachePart(JoinCacheValues(laptopFilters?.OperatingSystems)),
            CachePart(JoinCacheValues(tcgCharacters, value => value.Trim().ToLowerInvariant())),
            CachePart(JoinCacheValues(tcgSets, value => value.Trim().ToLowerInvariant())),
            CachePart(JoinCacheValues(tcgRarities, value => value.Trim().ToLowerInvariant())),
            CachePart(JoinCacheValues(tcgCrews, value => value.Trim().ToLowerInvariant())),
            CachePart(JoinCacheValues(yuGiOhFilters?.CardTypes, value => value.Trim().ToLowerInvariant())),
            CachePart(JoinCacheValues(yuGiOhFilters?.CardSubtypes, value => value.Trim().ToLowerInvariant())),
            CachePart(JoinCacheValues(yuGiOhFilters?.Attributes, value => value.Trim().ToLowerInvariant())),
            CachePart(JoinCacheValues(yuGiOhFilters?.MonsterRaces, value => value.Trim().ToLowerInvariant())),
            CachePart(JoinCacheValues(yuGiOhFilters?.SeriesTypes, value => value.Trim().ToLowerInvariant())),
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
        var updated = await query.ExecuteUpdateAsync(
            setters => setters
                .SetProperty(p => p.IsActive, isActive)
                .SetProperty(p => p.UpdatedAt, now),
            cancellationToken);

        if (updated > 0)
            InvalidateMixedCandidatesCache();
        return updated;
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
        int updated;
        if (updateCategory && updateShop)
        {
            updated = await query.ExecuteUpdateAsync(setters => setters
                .SetProperty(p => p.CategoryId, newCategoryId)
                .SetProperty(p => p.ShopId, newShopId)
                .SetProperty(p => p.UpdatedAt, now), cancellationToken);
        }
        else if (updateCategory)
        {
            updated = await query.ExecuteUpdateAsync(setters => setters
                .SetProperty(p => p.CategoryId, newCategoryId)
                .SetProperty(p => p.UpdatedAt, now), cancellationToken);
        }
        else
        {
            updated = await query.ExecuteUpdateAsync(setters => setters
                .SetProperty(p => p.ShopId, newShopId)
                .SetProperty(p => p.UpdatedAt, now), cancellationToken);
        }
        if (updated > 0)
            InvalidateMixedCandidatesCache();
        return updated;
    }

    public async Task<int> ReassignCategoryAsync(
        IReadOnlyCollection<Guid> categoryIds,
        Guid? targetCategoryId,
        CancellationToken cancellationToken = default)
    {
        var ids = categoryIds.Distinct().ToList();
        var now = DateTimeOffset.UtcNow;
        var updated = await _db.Products
            .Where(product => product.CategoryId.HasValue && ids.Contains(product.CategoryId.Value))
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(product => product.CategoryId, targetCategoryId)
                .SetProperty(product => product.UpdatedAt, now), cancellationToken);
        if (updated > 0)
            InvalidateMixedCandidatesCache();
        return updated;
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
                var categoryIds = await GetCategorySubtreeIdsAsync(catId, cancellationToken);
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
                    var categoryIds = await GetCategorySubtreeIdsAsync(matched.Id, cancellationToken);
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

    private static IQueryable<Product> ApplyLaptopFilters(
        IQueryable<Product> query,
        LaptopFilterCriteria? filters)
    {
        if (filters is null) return query;
        if (filters.Models is { Count: > 0 })
        {
            var values = filters.Models.Select(x => x.ToLower()).ToList();
            query = query.Where(p => p.LaptopSpecification != null
                && p.LaptopSpecification.Model != null
                && values.Contains(p.LaptopSpecification.Model.ToLower()));
        }
        if (filters.Processors is { Count: > 0 })
        {
            var values = filters.Processors.Select(x => x.ToLower()).ToList();
            query = query.Where(p => p.LaptopSpecification != null
                && p.LaptopSpecification.Processor != null
                && values.Contains(p.LaptopSpecification.Processor.ToLower()));
        }
        if (filters.RamGb is { Count: > 0 })
            query = query.Where(p => p.LaptopSpecification != null
                && p.LaptopSpecification.RamGb.HasValue
                && filters.RamGb.Contains(p.LaptopSpecification.RamGb.Value));
        if (filters.StorageTypes is { Count: > 0 })
        {
            var values = filters.StorageTypes.Select(x => x.ToLower()).ToList();
            query = query.Where(p => p.LaptopSpecification != null
                && p.LaptopSpecification.StorageType != null
                && values.Contains(p.LaptopSpecification.StorageType.ToLower()));
        }
        if (filters.StorageGb is { Count: > 0 })
            query = query.Where(p => p.LaptopSpecification != null
                && p.LaptopSpecification.StorageGb.HasValue
                && filters.StorageGb.Contains(p.LaptopSpecification.StorageGb.Value));
        if (filters.ScreenSizes is { Count: > 0 })
            query = query.Where(p => p.LaptopSpecification != null
                && p.LaptopSpecification.ScreenSizeInches.HasValue
                && filters.ScreenSizes.Contains(p.LaptopSpecification.ScreenSizeInches.Value));
        if (filters.OperatingSystems is { Count: > 0 })
        {
            var values = filters.OperatingSystems.Select(x => x.ToLower()).ToList();
            query = query.Where(p => p.LaptopSpecification != null
                && p.LaptopSpecification.OperatingSystem != null
                && values.Contains(p.LaptopSpecification.OperatingSystem.ToLower()));
        }
        return query;
    }

    private static IQueryable<Product> ApplyTcgFilters(
        IQueryable<Product> query,
        IReadOnlyList<string>? characters,
        IReadOnlyList<string>? sets,
        IReadOnlyList<string>? rarities,
        IReadOnlyList<string>? crews)
    {
        if (characters is { Count: > 0 })
        {
            var values = characters.Select(x => x.ToLower()).ToList();
            query = query.Where(p => p.TcgCardSpecification != null
                && ((p.TcgCardSpecification.CharacterName != null
                        && values.Contains(p.TcgCardSpecification.CharacterName.ToLower()))
                    || p.TcgCardSpecification.Characters.Any(link =>
                        values.Contains(link.Character.Name.ToLower()))));
        }
        if (sets is { Count: > 0 })
        {
            var values = sets.Select(x => x.ToLower()).ToList();
            query = query.Where(p => p.TcgCardSpecification != null
                && ((p.TcgCardSpecification.SetName != null
                        && values.Contains(p.TcgCardSpecification.SetName.ToLower()))
                    || (p.TcgCardSpecification.YuGiOhSpecification != null
                        && ((p.TcgCardSpecification.YuGiOhSpecification.Set != null
                                && p.TcgCardSpecification.YuGiOhSpecification.Set.NameRu != null
                                && values.Contains(p.TcgCardSpecification.YuGiOhSpecification.Set.NameRu.ToLower()))
                            || (p.TcgCardSpecification.YuGiOhSpecification.SetNameRu != null
                                && values.Contains(p.TcgCardSpecification.YuGiOhSpecification.SetNameRu.ToLower()))))));
        }
        if (rarities is { Count: > 0 })
        {
            var values = rarities.Select(x => x.ToLower()).ToList();
            query = query.Where(p => p.TcgCardSpecification != null
                && p.TcgCardSpecification.Rarity != null
                && values.Contains(p.TcgCardSpecification.Rarity.ToLower()));
        }
        if (crews is { Count: > 0 })
        {
            var values = crews.Select(x => x.ToLower()).ToList();
            query = query.Where(p => p.TcgCardSpecification != null
                && p.TcgCardSpecification.Characters.Any(link =>
                    link.Character.OnePieceSpecification != null
                    && link.Character.OnePieceSpecification.Crew != null
                    && values.Contains(link.Character.OnePieceSpecification.Crew.ToLower())));
        }
        return query;
    }

    private static IQueryable<Product> ApplyYuGiOhFilters(
        IQueryable<Product> query,
        YuGiOhFilterCriteria? filters)
    {
        if (filters is null) return query;
        if (filters.CardTypes is { Count: > 0 })
        {
            var values = filters.CardTypes.Select(x => x.ToLower()).ToList();
            query = query.Where(p => p.TcgCardSpecification != null
                && p.TcgCardSpecification.YuGiOhSpecification != null
                && p.TcgCardSpecification.YuGiOhSpecification.CardType != null
                && values.Contains(p.TcgCardSpecification.YuGiOhSpecification.CardType.ToLower()));
        }
        if (filters.CardSubtypes is { Count: > 0 })
        {
            var values = filters.CardSubtypes.Select(x => x.ToLower()).ToList();
            query = query.Where(p => p.TcgCardSpecification != null
                && p.TcgCardSpecification.YuGiOhSpecification != null
                && p.TcgCardSpecification.YuGiOhSpecification.CardSubtype != null
                && values.Contains(p.TcgCardSpecification.YuGiOhSpecification.CardSubtype.ToLower()));
        }
        if (filters.Attributes is { Count: > 0 })
        {
            var values = filters.Attributes.Select(x => x.ToLower()).ToList();
            query = query.Where(p => p.TcgCardSpecification != null
                && p.TcgCardSpecification.YuGiOhSpecification != null
                && p.TcgCardSpecification.YuGiOhSpecification.Attribute != null
                && values.Contains(p.TcgCardSpecification.YuGiOhSpecification.Attribute.ToLower()));
        }
        if (filters.MonsterRaces is { Count: > 0 })
        {
            var values = filters.MonsterRaces.Select(x => x.ToLower()).ToList();
            query = query.Where(p => p.TcgCardSpecification != null
                && p.TcgCardSpecification.YuGiOhSpecification != null
                && p.TcgCardSpecification.YuGiOhSpecification.MonsterRaceRu != null
                && values.Contains(p.TcgCardSpecification.YuGiOhSpecification.MonsterRaceRu.ToLower()));
        }
        if (filters.SeriesTypes is { Count: > 0 })
        {
            var values = filters.SeriesTypes.Select(x => x.ToLower()).ToList();
            query = query.Where(p => p.TcgCardSpecification != null
                && p.TcgCardSpecification.YuGiOhSpecification != null
                && ((p.TcgCardSpecification.YuGiOhSpecification.Set != null
                        && p.TcgCardSpecification.YuGiOhSpecification.Set.ReleaseTypeCode != null
                        && values.Contains(p.TcgCardSpecification.YuGiOhSpecification.Set.ReleaseTypeCode.ToLower()))
                    || (p.TcgCardSpecification.YuGiOhSpecification.SeriesType != null
                        && values.Contains(p.TcgCardSpecification.YuGiOhSpecification.SeriesType.ToLower()))));
        }
        return query;
    }

    public async Task<LaptopFilterFacets> ListLaptopFacetsAsync(
        Guid? categoryId,
        string? categorySlug,
        bool includeCategoryChildren,
        bool? activeOnly,
        CancellationToken cancellationToken = default)
    {
        var products = await BuildFilterQueryAsync(
            null, activeOnly, null, null, null, null, null, categoryId,
            categorySlug, includeCategoryChildren, null, null, cancellationToken);
        var specs = products.Where(p => p.LaptopSpecification != null)
            .Select(p => p.LaptopSpecification!);
        return new LaptopFilterFacets(
            await specs.Where(x => x.Model != null).Select(x => x.Model!).Distinct().OrderBy(x => x).ToListAsync(cancellationToken),
            await specs.Where(x => x.Processor != null).Select(x => x.Processor!).Distinct().OrderBy(x => x).ToListAsync(cancellationToken),
            await specs.Where(x => x.RamGb != null).Select(x => x.RamGb!.Value).Distinct().OrderBy(x => x).ToListAsync(cancellationToken),
            await specs.Where(x => x.StorageType != null).Select(x => x.StorageType!).Distinct().OrderBy(x => x).ToListAsync(cancellationToken),
            await specs.Where(x => x.StorageGb != null).Select(x => x.StorageGb!.Value).Distinct().OrderBy(x => x).ToListAsync(cancellationToken),
            await specs.Where(x => x.ScreenSizeInches != null).Select(x => x.ScreenSizeInches!.Value).Distinct().OrderBy(x => x).ToListAsync(cancellationToken),
            await specs.Where(x => x.OperatingSystem != null).Select(x => x.OperatingSystem!).Distinct().OrderBy(x => x).ToListAsync(cancellationToken));
    }

    public async Task<TcgFilterFacets> ListTcgFacetsAsync(
        Guid? categoryId,
        string? categorySlug,
        bool includeCategoryChildren,
        bool? activeOnly,
        CancellationToken cancellationToken = default)
    {
        var products = await BuildFilterQueryAsync(
            null, activeOnly, null, null, null, null, null, categoryId,
            categorySlug, includeCategoryChildren, null, null, cancellationToken);
        var legacyCharacters = products
            .Where(p => p.TcgCardSpecification != null
                && p.TcgCardSpecification.CharacterName != null)
            .Select(p => p.TcgCardSpecification!.CharacterName!);
        var normalizedCharacters = products
            .Where(p => p.TcgCardSpecification != null)
            .SelectMany(p => p.TcgCardSpecification!.Characters)
            .Select(link => link.Character.Name);
        var characters = await legacyCharacters
            .Concat(normalizedCharacters)
            .Distinct()
            .OrderBy(x => x)
            .ToListAsync(cancellationToken);
        var sets = await products
            .Where(p => p.TcgCardSpecification != null && p.TcgCardSpecification.SetName != null)
            .Select(p => p.TcgCardSpecification!.YuGiOhSpecification != null
                && p.TcgCardSpecification.YuGiOhSpecification.Set != null
                && p.TcgCardSpecification.YuGiOhSpecification.Set.NameRu != null
                    ? p.TcgCardSpecification.YuGiOhSpecification.Set.NameRu
                    : p.TcgCardSpecification.YuGiOhSpecification != null
                        && p.TcgCardSpecification.YuGiOhSpecification.SetNameRu != null
                    ? p.TcgCardSpecification.YuGiOhSpecification.SetNameRu
                    : p.TcgCardSpecification.SetName!)
            .Distinct().OrderBy(x => x).ToListAsync(cancellationToken);
        var rarities = await products
            .Where(p => p.TcgCardSpecification != null && p.TcgCardSpecification.Rarity != null)
            .Select(p => p.TcgCardSpecification!.Rarity!)
            .Distinct().OrderBy(x => x).ToListAsync(cancellationToken);
        var crews = await products
            .Where(p => p.TcgCardSpecification != null)
            .SelectMany(p => p.TcgCardSpecification!.Characters)
            .Where(link => link.Character.OnePieceSpecification != null
                && link.Character.OnePieceSpecification.Crew != null)
            .Select(link => link.Character.OnePieceSpecification!.Crew!)
            .Distinct().OrderBy(x => x).ToListAsync(cancellationToken);
        var yuGiOhSpecs = products
            .Where(p => p.TcgCardSpecification != null
                && p.TcgCardSpecification.YuGiOhSpecification != null)
            .Select(p => p.TcgCardSpecification!.YuGiOhSpecification!);
        var yuGiOh = new YuGiOhFilterFacets(
            await yuGiOhSpecs.Where(x => x.CardType != null).Select(x => x.CardType!).Distinct().OrderBy(x => x).ToListAsync(cancellationToken),
            await yuGiOhSpecs.Where(x => x.CardSubtype != null).Select(x => x.CardSubtype!).Distinct().OrderBy(x => x).ToListAsync(cancellationToken),
            await yuGiOhSpecs.Where(x => x.Attribute != null).Select(x => x.Attribute!).Distinct().OrderBy(x => x).ToListAsync(cancellationToken),
            await yuGiOhSpecs.Where(x => x.MonsterRaceRu != null).Select(x => x.MonsterRaceRu!).Distinct().OrderBy(x => x).ToListAsync(cancellationToken),
            await yuGiOhSpecs
                .Where(x => (x.Set != null && x.Set.ReleaseTypeCode != null) || x.SeriesType != null)
                .Select(x => x.Set != null && x.Set.ReleaseTypeCode != null
                    ? x.Set.ReleaseTypeCode
                    : x.SeriesType!)
                .Distinct().OrderBy(x => x).ToListAsync(cancellationToken));
        return new TcgFilterFacets(characters, sets, rarities, crews, yuGiOh);
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

    public void Add(Product product)
    {
        _db.Products.Add(product);
        InvalidateMixedCandidatesCache();
    }

    public async Task<IReadOnlyList<TcgCharacter>> ListTcgCharactersAsync(
        CancellationToken cancellationToken = default) =>
        await _db.TcgCharacters
            .Include(x => x.OnePieceSpecification)
            .ToListAsync(cancellationToken);

    public void Add(TcgCharacter character) => _db.TcgCharacters.Add(character);

    public async Task<IReadOnlyList<YuGiOhSet>> ListYuGiOhSetsAsync(
        CancellationToken cancellationToken = default) =>
        await _db.YuGiOhSets.ToListAsync(cancellationToken);

    public void Add(YuGiOhSet set) => _db.YuGiOhSets.Add(set);

    public void InvalidateCatalogCache() => InvalidateMixedCandidatesCache();

    public void Remove(Product product)
    {
        _db.Products.Remove(product);
        InvalidateMixedCandidatesCache();
    }

    private async Task<List<Guid>> GetCategorySubtreeIdsAsync(
        Guid rootId,
        CancellationToken cancellationToken)
    {
        var categories = await _db.Categories
            .AsNoTracking()
            .Select(category => new { category.Id, category.ParentId })
            .ToListAsync(cancellationToken);
        var ids = new HashSet<Guid> { rootId };
        var added = true;
        while (added)
        {
            added = false;
            foreach (var category in categories)
            {
                if (category.ParentId is { } parentId && ids.Contains(parentId))
                    added |= ids.Add(category.Id);
            }
        }
        return ids.ToList();
    }

    private static void InvalidateMixedCandidatesCache() =>
        Interlocked.Increment(ref _mixedCandidatesCacheVersion);

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
