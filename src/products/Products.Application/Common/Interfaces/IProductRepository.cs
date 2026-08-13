using Products.Domain.Entities;
using Products.Domain.Enums;

namespace Products.Application.Common.Interfaces;

public interface IProductRepository
{
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
        Guid? categoryId,
        string? categorySlug,
        bool includeCategoryChildren,
        decimal? priceMin,
        decimal? priceMax,
        int page,
        int pageSize,
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
    void Add(Product product);
    void Remove(Product product);
}
