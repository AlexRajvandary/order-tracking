namespace OrderTracking.Application.Common.Interfaces;

public interface IProductCatalogClient
{
    Task<CatalogProductSnapshot?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<CatalogCheckoutResolution> ResolveCheckoutAsync(IReadOnlyList<CatalogProductReference> items, CancellationToken cancellationToken);
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

public sealed record CatalogProductReference(string Source, Guid? ProductId, string? ExternalId, decimal? ExpectedUnitPrice, string? ExpectedCurrencyCode);
public sealed record CatalogCheckoutSnapshot(string Source, Guid? ProductId, string? ExternalId, string Name, string? Description,
    decimal Price, string CurrencyCode, string? ImageUrl, string? SourceUrl, string? AffiliateUrl, string? ShopCode, string? ShopName, bool Available);
public sealed record CatalogCheckoutIssue(string Source, string Id, string Reason, decimal? PreviousPrice, decimal? CurrentPrice, string? CurrencyCode);
public sealed record CatalogCheckoutResolution(IReadOnlyList<CatalogCheckoutSnapshot> Items, IReadOnlyList<CatalogCheckoutIssue> Issues);
public sealed class CatalogCheckoutException(IReadOnlyList<CatalogCheckoutIssue> issues) : Exception("Корзина изменилась. Проверьте цену и доступность товаров.")
{
    public IReadOnlyList<CatalogCheckoutIssue> Issues { get; } = issues;
}
public sealed class ExternalCatalogUnavailableException(string message) : Exception(message);
