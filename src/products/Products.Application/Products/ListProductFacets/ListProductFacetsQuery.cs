using MediatR;
using Products.Application.Brands.Models;
using Products.Application.Common.Interfaces;
using Products.Application.Shops.Models;

namespace Products.Application.Products.ListProductFacets;

public sealed record ListProductFacetsQuery(
    string? Category,
    bool IncludeCategoryChildren = true,
    bool? ActiveOnly = true) : IRequest<ProductFacetsResult>;

public sealed record ProductFacetsResult(
    IReadOnlyList<BrandDto> Brands,
    IReadOnlyList<ShopDto> Shops);

public sealed class ListProductFacetsQueryHandler(IProductRepository products)
    : IRequestHandler<ListProductFacetsQuery, ProductFacetsResult>
{
    public async Task<ProductFacetsResult> Handle(
        ListProductFacetsQuery request,
        CancellationToken cancellationToken)
    {
        var (brands, shops) = await products.ListFacetsAsync(
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
                shop.IsActive)).ToList());
    }
}
