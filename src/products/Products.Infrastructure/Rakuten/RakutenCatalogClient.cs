using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Products.Application.ExternalProducts;

namespace Products.Infrastructure.Rakuten;

internal sealed class RakutenCatalogClient : IRakutenCatalogClient
{
    private const string SearchPath = "ichibams/api/IchibaItem/Search/20260701";
    private readonly HttpClient _http;
    private readonly IMemoryCache _cache;
    private readonly RakutenSettings _settings;
    private readonly ILogger<RakutenCatalogClient> _logger;

    public RakutenCatalogClient(HttpClient http, IMemoryCache cache, IOptions<RakutenSettings> settings, ILogger<RakutenCatalogClient> logger)
    {
        _http = http;
        _cache = cache;
        _settings = settings.Value;
        _logger = logger;
    }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_settings.ApplicationId)
        && !string.IsNullOrWhiteSpace(_settings.AccessKey);

    public async Task<ExternalCatalogSearchResult> SearchAsync(RakutenSearchRequest request, CancellationToken cancellationToken)
    {
        EnsureConfigured();
        var page = Math.Clamp(request.Page, 1, 100);
        var hits = Math.Clamp(request.PageSize, 1, 30);
        var keyword = request.Keyword?.Trim();
        if (string.IsNullOrWhiteSpace(keyword) && request.GenreId is null)
            throw new ArgumentException("keyword or genreId is required");

        var key = $"rakuten:search:{keyword?.ToLowerInvariant()}:{request.GenreId}:{request.MinPrice}:{request.MaxPrice}:{page}:{hits}:{request.Sort}";
        if (_cache.TryGetValue(key, out ExternalCatalogSearchResult? cached) && cached is not null) return cached;

        var query = BaseQuery();
        if (!string.IsNullOrWhiteSpace(keyword)) query["keyword"] = keyword;
        if (request.GenreId is not null) query["genreId"] = request.GenreId.Value.ToString();
        if (request.MinPrice is > 0) query["minPrice"] = decimal.ToInt64(decimal.Ceiling(request.MinPrice.Value)).ToString();
        if (request.MaxPrice is > 0) query["maxPrice"] = decimal.ToInt64(decimal.Floor(request.MaxPrice.Value)).ToString();
        query["page"] = page.ToString(); query["hits"] = hits.ToString();
        query["availability"] = "1"; query["imageFlag"] = "1";
        query["sort"] = MapSort(request.Sort);

        var response = await SendAsync(BuildUri(query), cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound)
            return new ExternalCatalogSearchResult([], 0, page, hits, 0);
        await EnsureSuccessAsync(response, cancellationToken);
        RakutenSearchResponse body;
        try
        {
            body = await response.Content.ReadFromJsonAsync<RakutenSearchResponse>(cancellationToken: cancellationToken)
                ?? throw new ExternalCatalogUnavailableException("Rakuten returned an empty response.");
        }
        catch (JsonException ex)
        {
            throw new ExternalCatalogUnavailableException("Rakuten returned an invalid response.", ex);
        }
        var result = new ExternalCatalogSearchResult(
            (body.Items ?? []).Select(Map).Where(x => x is not null).Select(x => x!).ToList(),
            body.Count, body.Page, body.Hits, Math.Min(body.PageCount, 100));
        _cache.Set(key, result, new MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(Math.Max(10, _settings.SearchCacheSeconds)), Size = Math.Max(1, result.Items.Count),
        });
        return result;
    }

    public async Task<ExternalCatalogProductDto?> GetByItemCodeAsync(string itemCode, CancellationToken cancellationToken)
    {
        EnsureConfigured();
        itemCode = itemCode.Trim();
        if (itemCode.Length is 0 or > 255) return null;
        var key = $"rakuten:item:{itemCode}";
        if (_cache.TryGetValue(key, out ExternalCatalogProductDto? cached)) return cached;

        var query = BaseQuery(); query["itemCode"] = itemCode; query["hits"] = "1";
        var response = await SendAsync(BuildUri(query), cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            _cache.Set<ExternalCatalogProductDto?>(key, null, new MemoryCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(60), Size = 1 });
            return null;
        }
        await EnsureSuccessAsync(response, cancellationToken);
        RakutenSearchResponse? body;
        try { body = await response.Content.ReadFromJsonAsync<RakutenSearchResponse>(cancellationToken: cancellationToken); }
        catch (JsonException ex) { throw new ExternalCatalogUnavailableException("Rakuten returned an invalid response.", ex); }
        var result = body?.Items?.Select(Map).FirstOrDefault(x => x is not null);
        _cache.Set(key, result, new MemoryCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(Math.Max(10, _settings.ItemCacheSeconds)), Size = 1 });
        return result;
    }

    private async Task<HttpResponseMessage> SendAsync(Uri uri, CancellationToken cancellationToken)
    {
        for (var attempt = 0; ; attempt++)
        {
            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Get, uri);
                request.Headers.TryAddWithoutValidation("accessKey", _settings.AccessKey);
                var response = await _http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
                if (attempt < 2 && (response.StatusCode == HttpStatusCode.TooManyRequests || (int)response.StatusCode >= 500))
                {
                    var delay = response.Headers.RetryAfter?.Delta ?? TimeSpan.FromMilliseconds(250 * Math.Pow(2, attempt) + Random.Shared.Next(50, 200));
                    response.Dispose();
                    await Task.Delay(delay > TimeSpan.FromSeconds(5) ? TimeSpan.FromSeconds(5) : delay, cancellationToken);
                    continue;
                }
                if (response.StatusCode == HttpStatusCode.TooManyRequests || (int)response.StatusCode >= 500)
                {
                    response.Dispose();
                    throw new ExternalCatalogUnavailableException("Rakuten is temporarily unavailable.");
                }
                return response;
            }
            catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
            {
                throw new ExternalCatalogUnavailableException("Rakuten request timed out.");
            }
            catch (HttpRequestException ex) when (attempt >= 2)
            {
                _logger.LogWarning("Rakuten request failed after retries: {Error}", ex.Message);
                throw new ExternalCatalogUnavailableException("Rakuten is temporarily unavailable.", ex);
            }
            catch (HttpRequestException) when (attempt < 2)
            {
                await Task.Delay(TimeSpan.FromMilliseconds(250 * Math.Pow(2, attempt) + Random.Shared.Next(50, 200)), cancellationToken);
            }
        }
    }

    private static async Task EnsureSuccessAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        if (response.IsSuccessStatusCode) return;
        var message = response.StatusCode is HttpStatusCode.BadRequest or HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden
            ? "Rakuten rejected the API credentials or request parameters. Check ApplicationId and AccessKey."
            : $"Rakuten request failed with HTTP {(int)response.StatusCode}.";
        await response.Content.ReadAsStringAsync(cancellationToken); // drain response; never log credentials/body
        throw new ExternalCatalogUnavailableException(message);
    }

    private Dictionary<string, string> BaseQuery()
    {
        var query = new Dictionary<string, string>
        {
            ["applicationId"] = _settings.ApplicationId, ["format"] = "json", ["formatVersion"] = "2",
        };
        if (!string.IsNullOrWhiteSpace(_settings.AffiliateId)) query["affiliateId"] = _settings.AffiliateId;
        return query;
    }

    private Uri BuildUri(IReadOnlyDictionary<string, string> query)
    {
        var encoded = string.Join("&", query.Select(x => $"{Uri.EscapeDataString(x.Key)}={Uri.EscapeDataString(x.Value)}"));
        return new Uri(_http.BaseAddress!, $"{SearchPath}?{encoded}");
    }

    private void EnsureConfigured()
    {
        if (!IsConfigured) throw new ExternalCatalogUnavailableException("Rakuten integration is not configured.");
    }

    private static string MapSort(string? value) => value?.ToLowerInvariant() switch
    {
        "price-asc" => "+itemPrice", "price-desc" => "-itemPrice",
        "rating" => "-reviewAverage", "reviews" => "-reviewCount", _ => "standard",
    };

    private static ExternalCatalogProductDto? Map(RakutenItem item)
    {
        if (string.IsNullOrWhiteSpace(item.ItemCode) || string.IsNullOrWhiteSpace(item.ItemName)) return null;
        var image = item.MediumImageUrls?.Select(x => x.ImageUrl).FirstOrDefault(x => !string.IsNullOrWhiteSpace(x));
        return new ExternalCatalogProductDto(
            "rakuten:" + Base64Url(item.ItemCode), ProductSource.Rakuten, null, item.ItemCode,
            item.ItemName, item.ItemCaption, item.ItemPrice, "JPY", image, item.ItemUrl,
            item.AffiliateUrl, item.ShopCode, item.ShopName, item.GenreId, item.Availability == 1,
            item.ReviewAverage, item.ReviewCount, item.Availability == 1 && item.ItemPrice > 0);
    }

    private static string Base64Url(string value) => Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(value)).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private sealed record RakutenSearchResponse(int Count, int Page, int Hits, int PageCount, IReadOnlyList<RakutenItem>? Items);
    private sealed record RakutenItem(
        string ItemName, string ItemCode, decimal ItemPrice, string? ItemCaption, string? ItemUrl,
        string? AffiliateUrl, int Availability, long? GenreId, string? ShopCode, string? ShopName,
        decimal? ReviewAverage, int? ReviewCount, IReadOnlyList<RakutenImage>? MediumImageUrls);
    private sealed record RakutenImage([property: JsonPropertyName("imageUrl")] string ImageUrl);
}
