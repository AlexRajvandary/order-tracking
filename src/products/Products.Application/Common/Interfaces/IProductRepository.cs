using Products.Domain.Entities;
using Products.Domain.Enums;
using Products.Application.Products.Models;

namespace Products.Application.Common.Interfaces;

public interface IProductRepository
{
    Task<(IReadOnlyList<Brand> Brands, IReadOnlyList<Shop> Shops)> ListFacetsAsync(
        Guid? categoryId,
        string? categorySlug,
        bool includeCategoryChildren,
        bool? activeOnly,
        CancellationToken cancellationToken = default);
    Task<LaptopFilterFacets> ListLaptopFacetsAsync(
        Guid? categoryId,
        string? categorySlug,
        bool includeCategoryChildren,
        bool? activeOnly,
        CancellationToken cancellationToken = default);
    Task<TcgFilterFacets> ListTcgFacetsAsync(
        Guid? categoryId,
        string? categorySlug,
        bool includeCategoryChildren,
        bool? activeOnly,
        CancellationToken cancellationToken = default);
    Task<(IReadOnlyDictionary<Guid, int> ByCategory, int Total)> CountByCategoryAsync(
        bool? activeOnly,
        CancellationToken cancellationToken = default);
    Task<Product?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Product?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default);
    Task<bool> IsSlugTakenAsync(string slug, Guid? excludeId = null, CancellationToken cancellationToken = default);
    Task<bool> IsSkuTakenAsync(string sku, CancellationToken cancellationToken = default);
    Task<(IReadOnlyList<Product> Items, int Total)> SearchAsync(
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
        int page,
        int pageSize,
        bool mixCategories,
        int shuffleSeed,
        CancellationToken cancellationToken = default);
    Task<int> SetIsActiveAsync(
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
        CancellationToken cancellationToken = default);
    Task<int> BulkUpdateRelationsAsync(
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
        CancellationToken cancellationToken = default);
    Task<int> ReassignCategoryAsync(
        IReadOnlyCollection<Guid> categoryIds,
        Guid? targetCategoryId,
        CancellationToken cancellationToken = default);
    void InvalidateCatalogCache();
    void Add(Product product);
    Task<IReadOnlyList<TcgCharacter>> ListTcgCharactersAsync(CancellationToken cancellationToken = default);
    void Add(TcgCharacter character);
    void Remove(Product product);
    Task<IReadOnlyList<ProductTranslationPendingDto>> GetPendingTranslationsAsync(int limit, CancellationToken cancellationToken = default);
    Task<ProductTranslationStatsDto> GetTranslationStatsAsync(CancellationToken cancellationToken = default);
    Task<(int Updated, int NotFound)> SaveTranslationsAsync(IReadOnlyDictionary<Guid, string> translations, CancellationToken cancellationToken = default);
}
