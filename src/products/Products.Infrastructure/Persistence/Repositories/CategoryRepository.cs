using Microsoft.EntityFrameworkCore;
using Products.Application.Common.Interfaces;
using Products.Domain.Entities;

namespace Products.Infrastructure.Persistence.Repositories;

public sealed class CategoryRepository : ICategoryRepository
{
    private readonly ProductsDbContext _db;

    public CategoryRepository(ProductsDbContext db) => _db = db;

    public async Task<IReadOnlyList<Category>> ListAsync(
        bool activeOnly,
        CancellationToken cancellationToken = default)
    {
        var query = _db.Categories.AsNoTracking().AsQueryable();
        if (activeOnly)
        {
            query = query.Where(c => c.IsActive);
        }

        return await query
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Name)
            .ToListAsync(cancellationToken);
    }

    public Task<Category?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _db.Categories.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

    public Task<Category?> GetBySlugAsync(
        string slug,
        Guid? parentId,
        CancellationToken cancellationToken = default)
    {
        var query = _db.Categories.Where(c => c.Slug == slug);
        query = parentId is null
            ? query.Where(c => c.ParentId == null)
            : query.Where(c => c.ParentId == parentId);
        return query.FirstOrDefaultAsync(cancellationToken);
    }

    public Task<bool> IsSlugTakenAsync(
        string slug,
        Guid? parentId,
        Guid? excludeId = null,
        CancellationToken cancellationToken = default)
    {
        var query = _db.Categories.Where(c => c.Slug == slug && c.ParentId == parentId);
        if (excludeId.HasValue)
            query = query.Where(c => c.Id != excludeId.Value);
        return query.AnyAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Category>> ListSubtreeAsync(
        Guid rootId,
        CancellationToken cancellationToken = default)
    {
        var all = await _db.Categories.ToListAsync(cancellationToken);
        var ids = new HashSet<Guid> { rootId };
        var changed = true;
        while (changed)
        {
            changed = false;
            foreach (var category in all.Where(c => c.ParentId.HasValue && ids.Contains(c.ParentId.Value)))
                changed |= ids.Add(category.Id);
        }
        return all.Where(c => ids.Contains(c.Id)).ToList();
    }

    public void Add(Category category) => _db.Categories.Add(category);

    public void Remove(Category category) => _db.Categories.Remove(category);
}
