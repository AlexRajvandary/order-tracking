using Microsoft.EntityFrameworkCore;
using Products.Application.Common.Interfaces;
using Products.Domain.Entities;

namespace Products.Infrastructure.Persistence.Repositories;

public sealed class ShopRepository : IShopRepository
{
    private readonly ProductsDbContext _db;

    public ShopRepository(ProductsDbContext db) => _db = db;

    public async Task<IReadOnlyList<Shop>> ListAsync(
        bool activeOnly,
        CancellationToken cancellationToken = default)
    {
        var query = _db.Shops.AsQueryable();
        if (activeOnly)
            query = query.Where(s => s.IsActive);

        return await query
            .OrderBy(s => s.SortOrder)
            .ThenBy(s => s.Name)
            .ToListAsync(cancellationToken);
    }

    public Task<Shop?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default) =>
        _db.Shops.FirstOrDefaultAsync(s => s.Slug == slug, cancellationToken);

    public Task<Shop?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _db.Shops.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

    public void Add(Shop shop) => _db.Shops.Add(shop);
}
