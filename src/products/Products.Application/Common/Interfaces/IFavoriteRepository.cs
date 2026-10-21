using Products.Application.Cart;
using Products.Domain.Entities;

namespace Products.Application.Common.Interfaces;

public interface IFavoriteRepository
{
    Task<IReadOnlyList<Guid>> GetProductIdsAsync(CatalogStateOwner owner, CancellationToken cancellationToken = default);
    Task<CatalogFavorite?> FindAsync(CatalogStateOwner owner, Guid productId, CancellationToken cancellationToken = default);
    void Add(CatalogFavorite favorite);
    void Remove(CatalogFavorite favorite);
    Task ClearAsync(CatalogStateOwner owner, CancellationToken cancellationToken = default);
    Task MergeVisitorFavoritesAsync(Guid userId, string visitorKey, CancellationToken cancellationToken = default);
}
