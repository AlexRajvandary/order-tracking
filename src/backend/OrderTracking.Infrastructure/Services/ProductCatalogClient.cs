using System.Net;
using System.Net.Http.Json;
using OrderTracking.Application.Common.Interfaces;

namespace OrderTracking.Infrastructure.Services;

public sealed class ProductCatalogClient : IProductCatalogClient
{
    private readonly HttpClient _httpClient;
    private readonly string? _internalApiKey;

    public ProductCatalogClient(HttpClient httpClient, Microsoft.Extensions.Configuration.IConfiguration configuration)
    {
        _httpClient = httpClient;
        _internalApiKey = configuration["ProductsApi:InternalApiKey"];
    }

    public async Task<CatalogCheckoutResolution> ResolveCheckoutAsync(IReadOnlyList<CatalogProductReference> items, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "api/products/external/rakuten/resolve-checkout")
        {
            Content = JsonContent.Create(new { items })
        };
        if (!string.IsNullOrWhiteSpace(_internalApiKey)) request.Headers.Add("X-Products-Api-Key", _internalApiKey);
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (response.StatusCode == HttpStatusCode.ServiceUnavailable)
            throw new ExternalCatalogUnavailableException("Rakuten временно недоступен. Попробуйте ещё раз позже.");
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<CatalogCheckoutResolution>(cancellationToken: cancellationToken)
            ?? throw new InvalidOperationException("Products API returned an empty checkout response.");
    }

    public async Task<CatalogProductSnapshot?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken)
    {
        using var response = await _httpClient.GetAsync(
            $"api/products/{id}",
            cancellationToken);

        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }

        response.EnsureSuccessStatusCode();

        var product = await response.Content.ReadFromJsonAsync<ProductResponse>(
            cancellationToken: cancellationToken);

        return product is null
            ? null
            : new CatalogProductSnapshot(
                product.Id,
                product.Name,
                product.NameRu,
                product.Description,
                product.SourceUrl,
                product.Price,
                product.CurrencyCode,
                product.IsActive);
    }

    private sealed record ProductResponse(
        Guid Id,
        string Name,
        string? NameRu,
        string? Description,
        string? SourceUrl,
        decimal Price,
        string CurrencyCode,
        bool IsActive);
}
