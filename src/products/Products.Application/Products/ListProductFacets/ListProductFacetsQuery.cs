using MediatR;
using Products.Application.Brands.Models;
using Products.Application.Common.Interfaces;
using Products.Application.Shops.Models;
using Products.Application.Products.Models;

namespace Products.Application.Products.ListProductFacets;

public sealed record ListProductFacetsQuery(
    Guid? CategoryId,
    string? Category,
    bool IncludeCategoryChildren = true,
    bool? ActiveOnly = true) : IRequest<ProductFacetsResult>;

public sealed record ProductFacetsResult(
    IReadOnlyList<BrandDto> Brands,
    IReadOnlyList<ShopDto> Shops,
    LaptopFilterFacets Laptop,
    TcgFilterFacets Tcg);

public sealed class ListProductFacetsQueryHandler(IProductRepository products)
    : IRequestHandler<ListProductFacetsQuery, ProductFacetsResult>
{
    public async Task<ProductFacetsResult> Handle(
        ListProductFacetsQuery request,
        CancellationToken cancellationToken)
    {
        var (brands, shops) = await products.ListFacetsAsync(
            request.CategoryId,
            request.Category,
            request.IncludeCategoryChildren,
            request.ActiveOnly,
            cancellationToken);
        var laptop = string.Equals(request.Category, "laptops", StringComparison.OrdinalIgnoreCase)
            ? await products.ListLaptopFacetsAsync(
                request.CategoryId,
                request.Category,
                request.IncludeCategoryChildren,
                request.ActiveOnly,
                cancellationToken)
            : new LaptopFilterFacets([], [], [], [], [], [], []);
        // The category can be a TCG child (for example "pokemon"), so the
        // repository query is always scoped by the requested category id/slug.
        // The catalog only renders these facets for the TCG tree.
        var tcg = await products.ListTcgFacetsAsync(
            request.CategoryId,
            request.Category,
            request.IncludeCategoryChildren,
            request.ActiveOnly,
            cancellationToken);

        return new ProductFacetsResult(
            brands.Select(brand => new BrandDto(
                brand.Id,
                brand.Name,
                brand.Slug,
                brand.Description,
                brand.LogoUrl,
                brand.SortOrder,
                brand.IsActive)).ToList(),
            shops.Select(shop => new ShopDto(
                shop.Id,
                shop.Name,
                shop.Slug,
                shop.WebsiteUrl,
                shop.Description,
                shop.SortOrder,
                shop.IsActive)).ToList(),
            laptop,
            tcg);
    }
}
