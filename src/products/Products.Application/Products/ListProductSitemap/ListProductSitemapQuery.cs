using MediatR;
using Products.Application.Common.Interfaces;
using Products.Application.Products.Models;

namespace Products.Application.Products.ListProductSitemap;

public sealed record ListProductSitemapQuery : IRequest<IReadOnlyList<ProductSitemapItemDto>>;

public sealed class ListProductSitemapQueryHandler
    : IRequestHandler<ListProductSitemapQuery, IReadOnlyList<ProductSitemapItemDto>>
{
    private readonly IProductRepository _products;

    public ListProductSitemapQueryHandler(IProductRepository products)
    {
        _products = products;
    }

    public Task<IReadOnlyList<ProductSitemapItemDto>> Handle(
        ListProductSitemapQuery request,
        CancellationToken cancellationToken) =>
        _products.ListSitemapItemsAsync(cancellationToken);
}
