namespace Products.Application.ExternalProducts;

public enum ProductSource
{
    Internal,
    Rakuten,
}

public sealed record ExternalCatalogProductDto(
    string Id,
    ProductSource Source,
    Guid? ProductId,
    string? ExternalId,
    string Name,
    string? Description,
    decimal Price,
    string CurrencyCode,
    string? ImageUrl,
    string? SourceUrl,
    string? AffiliateUrl,
    string? ShopCode,
    string? ShopName,
    long? GenreId,
    bool Available,
    decimal? Rating,
    int? ReviewCount,
    bool CanAddToCart);

public sealed record ExternalCatalogSearchResult(
    IReadOnlyList<ExternalCatalogProductDto> Items,
    int Total,
    int Page,
    int PageSize,
    int TotalPages);

public sealed record RakutenSearchRequest(
    string? Keyword,
    long? GenreId,
    decimal? MinPrice,
    decimal? MaxPrice,
    int Page = 1,
    int PageSize = 20,
    string? Sort = null);

public interface IRakutenCatalogClient
{
    bool IsConfigured { get; }
    Task<ExternalCatalogSearchResult> SearchAsync(RakutenSearchRequest request, CancellationToken cancellationToken);
    Task<ExternalCatalogProductDto?> GetByItemCodeAsync(string itemCode, CancellationToken cancellationToken);
}

public sealed class ExternalCatalogUnavailableException : Exception
{
    public ExternalCatalogUnavailableException(string message, Exception? inner = null) : base(message, inner) { }
}
