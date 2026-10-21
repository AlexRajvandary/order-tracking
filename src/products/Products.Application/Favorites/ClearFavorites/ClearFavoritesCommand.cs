using MediatR;
using Products.Application.Common.Interfaces;

namespace Products.Application.Favorites.ClearFavorites;

public sealed record ClearFavoritesCommand : IRequest<ClearFavoritesResult>;

public abstract record ClearFavoritesResult
{
    public sealed record Cleared : ClearFavoritesResult;
    public sealed record OwnerRequired : ClearFavoritesResult;
}

public sealed class ClearFavoritesCommandHandler(
    IFavoriteRepository favoriteRepository,
    ICatalogOwnerProvider ownerProvider,
    IUnitOfWork unitOfWork) : IRequestHandler<ClearFavoritesCommand, ClearFavoritesResult>
{
    public async Task<ClearFavoritesResult> Handle(ClearFavoritesCommand request, CancellationToken cancellationToken)
    {
        var owner = ownerProvider.GetCurrentOwner();
        if (owner is null)
            return new ClearFavoritesResult.OwnerRequired();

        await unitOfWork.ExecuteInTransactionAsync(
            token => favoriteRepository.ClearAsync(owner.Value, token), cancellationToken);
        return new ClearFavoritesResult.Cleared();
    }
}
