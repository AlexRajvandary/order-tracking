using MediatR;
using Products.Application.Common.Exceptions;
using Products.Application.Common.Interfaces;
using Products.Application.Products.Models;

namespace Products.Application.Products.GetProduct;

public sealed record GetProductByIdQuery(Guid Id) : IRequest<ProductDto>;

public sealed class GetProductByIdQueryHandler : IRequestHandler<GetProductByIdQuery, ProductDto>
{
    private readonly IProductRepository _products;

    public GetProductByIdQueryHandler(IProductRepository products)
    {
        _products = products;
    }

    public async Task<ProductDto> Handle(GetProductByIdQuery request, CancellationToken cancellationToken)
    {
        var product = await _products.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException($"Product {request.Id} was not found.");
        return product.ToDto();
    }
}

public sealed record GetProductBySlugQuery(string Slug) : IRequest<ProductDto>;

public sealed class GetProductBySlugQueryHandler : IRequestHandler<GetProductBySlugQuery, ProductDto>
{
    private readonly IProductRepository _products;

    public GetProductBySlugQueryHandler(IProductRepository products)
    {
        _products = products;
    }

    public async Task<ProductDto> Handle(GetProductBySlugQuery request, CancellationToken cancellationToken)
    {
        var product = await _products.GetBySlugAsync(request.Slug, cancellationToken)
            ?? throw new NotFoundException($"Product slug '{request.Slug}' was not found.");
        return product.ToDto();
    }
}
