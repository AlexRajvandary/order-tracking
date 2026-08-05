using Products.Domain.Entities;

namespace Products.Application.Common.Interfaces;

public interface IProductAuditWriter
{
    Task WriteAsync(
        Guid productId,
        string action,
        Product? oldValues,
        Product? newValues,
        CancellationToken cancellationToken = default);

    Task<(IReadOnlyList<ProductAuditLog> Items, int Total)> GetByProductAsync(
        Guid productId,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);
}
