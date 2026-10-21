using MediatR;
using Products.Application.Common.Interfaces;

namespace Products.Application.Cart.ClearCart;

public sealed record ClearCartCommand : IRequest<ClearCartResult>;

public abstract record ClearCartResult
{
    public sealed record Cleared : ClearCartResult;
    public sealed record OwnerRequired : ClearCartResult;
}

public sealed class ClearCartCommandHandler(
    ICartRepository cartRepository,
    ICatalogOwnerProvider ownerProvider,
    IUnitOfWork unitOfWork) : IRequestHandler<ClearCartCommand, ClearCartResult>
{
    public async Task<ClearCartResult> Handle(ClearCartCommand request, CancellationToken cancellationToken)
    {
        var owner = ownerProvider.GetCurrentOwner();
        if (owner is null)
            return new ClearCartResult.OwnerRequired();

        await unitOfWork.ExecuteInTransactionAsync(
            token => cartRepository.ClearAsync(owner.Value, token), cancellationToken);
        return new ClearCartResult.Cleared();
    }
}
