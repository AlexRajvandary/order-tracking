using Products.Domain.Entities;

namespace Products.Application.Common.Interfaces;

public interface IShopRepository
{
    Task<IReadOnlyList<Shop>> ListAsync(bool activeOnly, CancellationToken cancellationToken = default);
    Task<Shop?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default);
    Task<Shop?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    void Add(Shop shop);
}
