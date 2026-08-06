using Microsoft.EntityFrameworkCore;
using Products.Application.Common.Interfaces;
using Products.Domain.Entities;
using Products.Domain.Enums;

namespace Products.Infrastructure.Persistence.Repositories;

public sealed class ProductRepository : IProductRepository
{
    private readonly ProductsDbContext _db;

    public ProductRepository(ProductsDbContext db) => _db = db;

    public Task<Product?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _db.Products
            .Include(p => p.Shop)
            .Include(p => p.BrandEntity)
            .Include(p => p.Category)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

    public Task<Product?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default) =>
        _db.Products
            .Include(p => p.Shop)
            .Include(p => p.BrandEntity)
            .Include(p => p.Category)
            .FirstOrDefaultAsync(p => p.Slug == slug, cancellationToken);

    public Task<bool> IsSlugTakenAsync(
        string slug,
        Guid? excludeId = null,
        CancellationToken cancellationToken = default)
    {
        var query = _db.Products.Where(p => p.Slug == slug);
        if (excludeId is not null)
        {
            query = query.Where(p => p.Id != excludeId);
        }

        return query.AnyAsync(cancellationToken);
    }

    public async Task<(IReadOnlyList<Product> Items, int Total)> SearchAsync(
        string? search,
        bool? activeOnly,
        IReadOnlyList<Guid>? brandIds,
        IReadOnlyList<string>? brandSlugs,
        IReadOnlyList<Guid>? shopIds,
        IReadOnlyList<string>? shopSlugs,
        IReadOnlyList<ProductCondition>? conditions,
        Guid? categoryId,
        string? categorySlug,
        bool includeCategoryChildren,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = _db.Products.AsQueryable();

        if (activeOnly == true)
        {
            query = query.Where(p => p.IsActive);
        }
        else if (activeOnly == false)
        {
            query = query.Where(p => !p.IsActive);
        }

        if (brandIds is { Count: > 0 })
        {
            query = query.Where(p => p.BrandId != null && brandIds.Contains(p.BrandId.Value));
        }
        else if (brandSlugs is { Count: > 0 })
        {
            var slugs = brandSlugs
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Select(s => s.Trim().ToLower())
                .Distinct()
                .ToList();
            if (slugs.Count > 0)
            {
                query = query.Where(p =>
                    p.BrandEntity != null && slugs.Contains(p.BrandEntity.Slug.ToLower()));
            }
        }

        if (shopIds is { Count: > 0 })
        {
            query = query.Where(p => p.ShopId != null && shopIds.Contains(p.ShopId.Value));
        }
        else if (shopSlugs is { Count: > 0 })
        {
            var slugs = shopSlugs
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Select(s => s.Trim().ToLower())
                .Distinct()
                .ToList();
            if (slugs.Count > 0)
            {
                query = query.Where(p =>
                    p.Shop != null && slugs.Contains(p.Shop.Slug.ToLower()));
            }
        }

        if (conditions is { Count: > 0 })
        {
            query = query.Where(p => conditions.Contains(p.Condition));
        }

        if (categoryId is { } catId)
        {
            if (includeCategoryChildren)
            {
                query = query.Where(p =>
                    p.CategoryId == catId
                    || (p.Category != null && p.Category.ParentId == catId));
            }
            else
            {
                query = query.Where(p => p.CategoryId == catId);
            }
        }
        else if (!string.IsNullOrWhiteSpace(categorySlug))
        {
            var slug = categorySlug.Trim().ToLower();
            var matched = await _db.Categories
                .AsNoTracking()
                .Where(c => c.Slug.ToLower() == slug)
                .Select(c => new { c.Id, c.ParentId })
                .FirstOrDefaultAsync(cancellationToken);

            if (matched is null)
            {
                query = query.Where(_ => false);
            }
            else if (includeCategoryChildren || matched.ParentId is null)
            {
                var rootId = matched.Id;
                query = query.Where(p =>
                    p.CategoryId == rootId
                    || (p.Category != null && p.Category.ParentId == rootId));
            }
            else
            {
                query = query.Where(p => p.CategoryId == matched.Id);
            }
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(p =>
                p.Name.ToLower().Contains(term)
                || (p.Brand != null && p.Brand.ToLower().Contains(term))
                || (p.Sku != null && p.Sku.ToLower().Contains(term))
                || (p.Description != null && p.Description.ToLower().Contains(term))
                || p.Slug.ToLower().Contains(term));
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .Include(p => p.Shop)
            .Include(p => p.BrandEntity)
            .Include(p => p.Category)
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, total);
    }

    public void Add(Product product) => _db.Products.Add(product);

    public void Remove(Product product) => _db.Products.Remove(product);
}
