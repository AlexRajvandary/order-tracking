using Microsoft.EntityFrameworkCore;
using Products.Application.Common.Interfaces;
using Products.Domain.Entities;

namespace Products.Infrastructure.Persistence.Repositories;

public sealed class ShopRepository(ProductsDbContext db) : IShopRepository
{
    public void Add(Shop shop) => db.Shops.Add(shop);

    public async Task<IReadOnlyList<Shop>> ListAsync(bool activeOnly, CancellationToken cancellationToken = default)
    {
        var query = db.Shops.AsQueryable();
        if (activeOnly)
        {
            query = query.Where(s => s.IsActive);
        }

        return await query
            .OrderBy(s => s.SortOrder)
            .ThenBy(s => s.Name)
            .ToListAsync(cancellationToken);
    }

    public Task<Shop?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default) =>
        db.Shops.FirstOrDefaultAsync(s => s.Slug == slug, cancellationToken);

    public Task<Shop?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        db.Shops.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
}