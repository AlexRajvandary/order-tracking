using Microsoft.EntityFrameworkCore;
using Products.Application.Common.Interfaces;
using Products.Domain.Entities;

namespace Products.Infrastructure.Persistence.Repositories;

public sealed class BrandRepository : IBrandRepository
{
    private readonly ProductsDbContext _db;

    public BrandRepository(ProductsDbContext db) => _db = db;

    public async Task<IReadOnlyList<Brand>> ListAsync(
        bool activeOnly,
        CancellationToken cancellationToken = default)
    {
        var query = _db.Brands.AsQueryable();
        if (activeOnly)
            query = query.Where(b => b.IsActive);

        return await query
            .OrderBy(b => b.SortOrder)
            .ThenBy(b => b.Name)
            .ToListAsync(cancellationToken);
    }

    public Task<Brand?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default) =>
        _db.Brands.FirstOrDefaultAsync(b => b.Slug == slug, cancellationToken);

    public Task<Brand?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _db.Brands.FirstOrDefaultAsync(b => b.Id == id, cancellationToken);

    public void Add(Brand brand) => _db.Brands.Add(brand);
}
