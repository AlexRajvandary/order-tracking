using Products.Domain.Entities;

namespace Products.Application.Common.Interfaces;

public interface ICategoryRepository
{
    Task<IReadOnlyList<Category>> ListAsync(bool activeOnly, CancellationToken cancellationToken = default);
    Task<Category?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Category?> GetBySlugAsync(string slug, Guid? parentId, CancellationToken cancellationToken = default);
    void Add(Category category);
}
