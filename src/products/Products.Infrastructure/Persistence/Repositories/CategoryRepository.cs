using Microsoft.EntityFrameworkCore;
using Products.Application.Common.Interfaces;
using Products.Domain.Entities;

namespace Products.Infrastructure.Persistence.Repositories;

public sealed class CategoryRepository(ProductsDbContext db) : ICategoryRepository
{
    public async Task<IReadOnlyList<Category>> ListAsync(bool activeOnly, CancellationToken cancellationToken = default)
    {
        var query = db.Categories.AsNoTracking().AsQueryable();

        if (activeOnly)
        {
            query = query.Where(category => category.IsActive);
        }

        return await query
            .OrderBy(category => category.SortOrder)
            .ThenBy(category => category.Name)
            .ToListAsync(cancellationToken);
    }

    public Task<Category?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        db.Categories.FirstOrDefaultAsync(category => category.Id == id, cancellationToken);

    public Task<Category?> GetBySlugAsync(string slug, Guid? parentId, CancellationToken cancellationToken = default)
    {
        var query = db.Categories.Where(category => category.Slug == slug);
        query = parentId is null
            ? query.Where(category => category.ParentId == null)
            : query.Where(category => category.ParentId == parentId);

        return query.FirstOrDefaultAsync(cancellationToken);
    }

    public Task<bool> IsSlugTakenAsync(
        string slug,
        Guid? parentId,
        Guid? excludeId = null,
        CancellationToken cancellationToken = default)
    {
        var query = db.Categories.Where(category => category.Slug == slug && category.ParentId == parentId);

        if (excludeId.HasValue)
        {
            query = query.Where(category => category.Id != excludeId.Value);
        }

        return query.AnyAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Category>> ListSubtreeAsync(Guid rootId, CancellationToken cancellationToken = default)
    {
        var all = await db.Categories.ToListAsync(cancellationToken);
        var ids = new HashSet<Guid> { rootId };
        var changed = true;
        while (changed)
        {
            changed = false;
            foreach (var category in all.Where(category => category.ParentId.HasValue && ids.Contains(category.ParentId.Value)))
            {
                changed |= ids.Add(category.Id);
            }
        }
        return all.Where(category => ids.Contains(category.Id)).ToList();
    }

    public void Add(Category category) => db.Categories.Add(category);

    public void Remove(Category category) => db.Categories.Remove(category);
}
