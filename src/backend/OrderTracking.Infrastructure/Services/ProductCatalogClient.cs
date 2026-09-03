using System.Net;
using System.Net.Http.Json;
using OrderTracking.Application.Common.Interfaces;

namespace OrderTracking.Infrastructure.Services;

public sealed class ProductCatalogClient : IProductCatalogClient
{
    private readonly HttpClient _httpClient;

    public ProductCatalogClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
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
