using FluentValidation;
using MediatR;
using Products.Application.Common.Interfaces;
using Products.Application.Products.Models;

namespace Products.Application.Products.ListProducts;

public sealed record ListProductsQuery(
    string? Search,
    bool? ActiveOnly,
    int Page = 1,
    int PageSize = 20) : IRequest<ProductListResult>;

public sealed class ListProductsQueryValidator : AbstractValidator<ListProductsQuery>
{
    public ListProductsQueryValidator()
    {
        RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 100);
        RuleFor(x => x.Search).MaximumLength(200).When(x => !string.IsNullOrWhiteSpace(x.Search));
    }
}

public sealed class ListProductsQueryHandler : IRequestHandler<ListProductsQuery, ProductListResult>
{
    private readonly IProductRepository _products;

    public ListProductsQueryHandler(IProductRepository products)
    {
        _products = products;
    }

    public async Task<ProductListResult> Handle(ListProductsQuery request, CancellationToken cancellationToken)
    {
        var (items, total) = await _products.SearchAsync(
            request.Search,
            request.ActiveOnly,
            request.Page,
            request.PageSize,
            cancellationToken);

        return new ProductListResult(
            items.Select(p => p.ToDto()).ToList(),
            total,
            request.Page,
            request.PageSize);
    }
}
