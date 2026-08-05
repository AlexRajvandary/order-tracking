using FluentValidation;
using MediatR;
using Products.Application.Common.Exceptions;
using Products.Application.Common.Interfaces;
using Products.Application.Products.Models;

namespace Products.Application.Products.GetProductAudit;

public sealed record GetProductAuditQuery(
    Guid ProductId,
    int Page = 1,
    int PageSize = 20) : IRequest<ProductAuditListResult>;

public sealed class GetProductAuditQueryValidator : AbstractValidator<GetProductAuditQuery>
{
    public GetProductAuditQueryValidator()
    {
        RuleFor(x => x.ProductId).NotEmpty();
        RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 100);
    }
}

public sealed class GetProductAuditQueryHandler : IRequestHandler<GetProductAuditQuery, ProductAuditListResult>
{
    private readonly IProductRepository _products;
    private readonly IProductAuditWriter _audit;

    public GetProductAuditQueryHandler(IProductRepository products, IProductAuditWriter audit)
    {
        _products = products;
        _audit = audit;
    }

    public async Task<ProductAuditListResult> Handle(
        GetProductAuditQuery request,
        CancellationToken cancellationToken)
    {
        var (items, total) = await _audit.GetByProductAsync(
            request.ProductId,
            request.Page,
            request.PageSize,
            cancellationToken);

        if (total == 0 && await _products.GetByIdAsync(request.ProductId, cancellationToken) is null)
        {
            throw new NotFoundException($"Product {request.ProductId} was not found.");
        }

        return new ProductAuditListResult(
            items.Select(a => new ProductAuditDto(
                a.Id,
                a.ProductId,
                a.Action,
                a.ActorAdminId,
                a.ActorLogin,
                a.OldValues,
                a.NewValues,
                a.CreatedAt)).ToList(),
            total,
            request.Page,
            request.PageSize);
    }
}
