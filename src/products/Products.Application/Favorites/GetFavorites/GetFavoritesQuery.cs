using MediatR;
using Products.Application.Common.Interfaces;

namespace Products.Application.Favorites.GetFavorites;

public sealed record GetFavoritesQuery : IRequest<GetFavoritesResult>;

public abstract record GetFavoritesResult
{
    public sealed record Success(IReadOnlyList<Guid> ProductIds) : GetFavoritesResult;
    public sealed record OwnerRequired : GetFavoritesResult;
}

public sealed class GetFavoritesQueryHandler(
    IFavoriteRepository favoriteRepository,
    ICatalogOwnerProvider ownerProvider) : IRequestHandler<GetFavoritesQuery, GetFavoritesResult>
{
    public async Task<GetFavoritesResult> Handle(GetFavoritesQuery request, CancellationToken cancellationToken)
    {
        var owner = ownerProvider.GetCurrentOwner();
        if (owner is null)
            return new GetFavoritesResult.OwnerRequired();

        return new GetFavoritesResult.Success(
            await favoriteRepository.GetProductIdsAsync(owner.Value, cancellationToken));
    }
}
