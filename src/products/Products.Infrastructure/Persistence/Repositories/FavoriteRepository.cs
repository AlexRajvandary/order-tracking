using Microsoft.EntityFrameworkCore;
using Products.Application.Cart;
using Products.Application.Common.Interfaces;
using Products.Domain.Entities;

namespace Products.Infrastructure.Persistence.Repositories;

public sealed class FavoriteRepository(ProductsDbContext db) : IFavoriteRepository
{
    public async Task<IReadOnlyList<Guid>> GetProductIdsAsync(CatalogStateOwner owner, CancellationToken cancellationToken = default) =>
        await OwnedBy(db.CatalogFavorites.AsNoTracking(), owner)
            .OrderByDescending(favorite => favorite.CreatedAt)
            .Select(favorite => favorite.ProductId)
            .ToListAsync(cancellationToken);

    public Task<CatalogFavorite?> FindAsync(CatalogStateOwner owner, Guid productId, CancellationToken cancellationToken = default) =>
        OwnedBy(db.CatalogFavorites.Where(favorite => favorite.ProductId == productId), owner)
            .SingleOrDefaultAsync(cancellationToken);

    public void Add(CatalogFavorite favorite) => db.CatalogFavorites.Add(favorite);

    public void Remove(CatalogFavorite favorite) => db.CatalogFavorites.Remove(favorite);

    public Task ClearAsync(CatalogStateOwner owner, CancellationToken cancellationToken = default) =>
        OwnedBy(db.CatalogFavorites, owner).ExecuteDeleteAsync(cancellationToken);

    public async Task MergeVisitorFavoritesAsync(Guid userId, string visitorKey, CancellationToken cancellationToken = default)
    {
        var guestFavorites = await db.CatalogFavorites.Where(favorite => favorite.VisitorKey == visitorKey)
            .ToListAsync(cancellationToken);
        var accountProductIds = await db.CatalogFavorites.Where(favorite => favorite.UserId == userId)
            .Select(favorite => favorite.ProductId)
            .ToHashSetAsync(cancellationToken);

        foreach (var favorite in guestFavorites)
        {
            if (!accountProductIds.Add(favorite.ProductId))
            {
                db.CatalogFavorites.Remove(favorite);
                continue;
            }

            favorite.UserId = userId;
            favorite.VisitorKey = null;
        }
    }

    private static IQueryable<CatalogFavorite> OwnedBy(IQueryable<CatalogFavorite> query, CatalogStateOwner owner) =>
        owner.UserId is Guid userId
            ? query.Where(favorite => favorite.UserId == userId)
            : query.Where(favorite => favorite.VisitorKey == owner.VisitorKey);
}
