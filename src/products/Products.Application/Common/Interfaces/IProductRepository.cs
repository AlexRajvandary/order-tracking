using Products.Domain.Entities;

namespace Products.Application.Common.Interfaces;

public interface IProductRepository
{
    Task<Product?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Product?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default);
    Task<bool> IsSlugTakenAsync(string slug, Guid? excludeId = null, CancellationToken cancellationToken = default);
    Task<(IReadOnlyList<Product> Items, int Total)> SearchAsync(
        string? search,
        bool? activeOnly,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);
    void Add(Product product);
    void Remove(Product product);
}
