using MediatR;
using Products.Application.Common.Exceptions;
using Products.Application.Common.Interfaces;
using Products.Domain.Enums;

namespace Products.Application.Products.DeleteProduct;

public sealed record DeleteProductCommand(Guid Id) : IRequest;

public sealed class DeleteProductCommandHandler : IRequestHandler<DeleteProductCommand>
{
    private readonly IProductRepository _products;
    private readonly IProductAuditWriter _audit;
    private readonly IUnitOfWork _uow;

    public DeleteProductCommandHandler(
        IProductRepository products,
        IProductAuditWriter audit,
        IUnitOfWork uow)
    {
        _products = products;
        _audit = audit;
        _uow = uow;
    }

    public async Task Handle(DeleteProductCommand request, CancellationToken cancellationToken)
    {
        var product = await _products.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException($"Product {request.Id} was not found.");

        await _audit.WriteAsync(product.Id, ProductAuditActions.Deleted, product, null, cancellationToken);
        _products.Remove(product);
        await _uow.SaveChangesAsync(cancellationToken);
    }
}
