using Microsoft.EntityFrameworkCore;
using Products.Application.Common.Interfaces;
using Products.Domain.Entities;

namespace Products.Infrastructure.Persistence.Repositories;

public sealed class BrandRepository(ProductsDbContext db) : IBrandRepository
{
    public void Add(Brand brand) => db.Brands.Add(brand);

    public async Task<IReadOnlyList<Brand>> ListAsync(bool activeOnly, CancellationToken cancellationToken = default)
    {
        var query = db.Brands.AsQueryable();

        if (activeOnly)
        {
            query = query.Where(brand => brand.IsActive);
        }

        return await query
            .OrderBy(brand => brand.SortOrder)
            .ThenBy(brand => brand.Name)
            .ToListAsync(cancellationToken);
    }

    public Task<Brand?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
       db.Brands.FirstOrDefaultAsync(brand => brand.Id == id, cancellationToken);

    public Task<Brand?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default) =>
        db.Brands.FirstOrDefaultAsync(brand => brand.Slug == slug, cancellationToken);
}