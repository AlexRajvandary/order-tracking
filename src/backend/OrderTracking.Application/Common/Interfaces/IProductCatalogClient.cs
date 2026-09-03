namespace OrderTracking.Application.Common.Interfaces;

public interface IProductCatalogClient
{
    Task<CatalogProductSnapshot?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
}

public sealed record CatalogProductSnapshot(
    Guid Id,
    string Name,
    string? NameRu,
    string? Description,
    string? SourceUrl,
    decimal Price,
    string CurrencyCode,
    bool IsActive);
