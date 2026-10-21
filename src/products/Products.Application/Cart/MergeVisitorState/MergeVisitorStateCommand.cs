using MediatR;
using Products.Application.Common.Interfaces;

namespace Products.Application.Cart.MergeVisitorState;

public sealed record MergeVisitorStateCommand : IRequest<MergeVisitorStateResult>;

public abstract record MergeVisitorStateResult
{
    public sealed record Merged : MergeVisitorStateResult;
    public sealed record InvalidOwner : MergeVisitorStateResult;
}

public sealed class MergeVisitorStateCommandHandler(
    ICartRepository cartRepository,
    IFavoriteRepository favoriteRepository,
    ICatalogOwnerProvider ownerProvider,
    IUnitOfWork unitOfWork) : IRequestHandler<MergeVisitorStateCommand, MergeVisitorStateResult>
{
    public async Task<MergeVisitorStateResult> Handle(MergeVisitorStateCommand request, CancellationToken cancellationToken)
    {
        var userId = ownerProvider.GetAuthenticatedUserId();
        var visitorKey = ownerProvider.GetVisitorKey()?.Trim();
        if (userId is null || !CatalogStateOwner.IsValidVisitorKey(visitorKey))
            return new MergeVisitorStateResult.InvalidOwner();

        await unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            await cartRepository.MergeVisitorCartAsync(userId.Value, visitorKey!, token);
            await favoriteRepository.MergeVisitorFavoritesAsync(userId.Value, visitorKey!, token);
        }, cancellationToken);

        return new MergeVisitorStateResult.Merged();
    }
}
