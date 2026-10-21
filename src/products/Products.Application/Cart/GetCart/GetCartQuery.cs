using MediatR;
using Products.Application.Common.Interfaces;

namespace Products.Application.Cart.GetCart
{
    public sealed record GetCartQuery : IRequest<GetCartResult>;

    public abstract record GetCartResult
    {
        public sealed record Success(IReadOnlyList<CartItemDto> Items) : GetCartResult;
        public sealed record OwnerRequired : GetCartResult;
    }

    public sealed class GetCartQueryHandler(
        ICartRepository cartRepository,
        ICatalogOwnerProvider ownerProvider) : IRequestHandler<GetCartQuery, GetCartResult>
    {
        public async Task<GetCartResult> Handle(GetCartQuery request, CancellationToken cancellationToken)
        {
            var owner = ownerProvider.GetCurrentOwner();
            if (owner is null)
            {
                return new GetCartResult.OwnerRequired();
            }

            return new GetCartResult.Success(await cartRepository.GetCartAsync(owner.Value, cancellationToken));
        }
    }
}
