using Products.Domain.Entities;

namespace Products.Application.Common.Interfaces;

public interface ICatalogProductRepository
{
    Task<Product?> GetActiveForCartAsync(Guid id, CancellationToken cancellationToken = default);
    Task<bool> HasColorAsync(Guid productId, string color, CancellationToken cancellationToken = default);
    Task<bool> HasSizeAsync(Guid productId, string size, CancellationToken cancellationToken = default);
}
