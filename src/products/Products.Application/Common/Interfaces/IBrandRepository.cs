using Products.Domain.Entities;

namespace Products.Application.Common.Interfaces;

public interface IBrandRepository
{
    Task<IReadOnlyList<Brand>> ListAsync(bool activeOnly, CancellationToken cancellationToken = default);
    Task<Brand?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default);
    Task<Brand?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    void Add(Brand brand);
}
