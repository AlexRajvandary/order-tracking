using MediatR;
using Products.Application.Brands.Models;
using Products.Application.Common.Interfaces;

namespace Products.Application.Brands.ListBrands;

public sealed record ListBrandsQuery(bool ActiveOnly = true) : IRequest<BrandListResult>;

public sealed class ListBrandsQueryHandler : IRequestHandler<ListBrandsQuery, BrandListResult>
{
    private readonly IBrandRepository _brands;

    public ListBrandsQueryHandler(IBrandRepository brands) => _brands = brands;

    public async Task<BrandListResult> Handle(ListBrandsQuery request, CancellationToken cancellationToken)
    {
        var items = await _brands.ListAsync(request.ActiveOnly, cancellationToken);
        return new BrandListResult(
            items.Select(b => new BrandDto(
                b.Id,
                b.Name,
                b.Slug,
                b.Description,
                b.LogoUrl,
                b.SortOrder,
                b.IsActive)).ToList());
    }
}
