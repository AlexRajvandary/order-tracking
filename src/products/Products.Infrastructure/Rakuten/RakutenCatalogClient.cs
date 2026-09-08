using System.Net;
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
        ParsedResponse body;
        try
        {
            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
            body = Parse(document.RootElement);
        }
        catch (JsonException ex)
        {
            throw new ExternalCatalogUnavailableException("Rakuten returned an invalid response.", ex);
        }
        var result = new ExternalCatalogSearchResult(
            body.Items,
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
        ParsedResponse body;
        try
        {
            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
            body = Parse(document.RootElement);
        }
        catch (JsonException ex) { throw new ExternalCatalogUnavailableException("Rakuten returned an invalid response.", ex); }
        var result = body.Items.FirstOrDefault();
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

    private static ParsedResponse Parse(JsonElement root)
    {
        var items = new List<ExternalCatalogProductDto>();
        if (Property(root, "items") is { ValueKind: JsonValueKind.Array } array)
        {
            foreach (var raw in array.EnumerateArray())
            {
                var item = Property(raw, "item") is { ValueKind: JsonValueKind.Object } wrapped ? wrapped : raw;
                var code = String(item, "itemCode"); var name = String(item, "itemName");
                if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(name)) continue;
                var price = Decimal(item, "itemPrice"); var availability = Int(item, "availability", 1);
                items.Add(new ExternalCatalogProductDto(
                    "rakuten:" + Base64Url(code), ProductSource.Rakuten, null, code, name,
                    String(item, "itemCaption"), price, "JPY", FirstImage(item), String(item, "itemUrl"),
                    String(item, "affiliateUrl"), String(item, "shopCode"), String(item, "shopName"),
                    LongNullable(item, "genreId"), availability == 1, DecimalNullable(item, "reviewAverage"),
                    IntNullable(item, "reviewCount"), availability == 1 && price > 0));
            }
        }
        return new ParsedResponse(Int(root, "count"), Int(root, "page", 1), Int(root, "hits", items.Count),
            Int(root, "pageCount"), items);
    }

    private static JsonElement? Property(JsonElement element, string name)
    {
        if (element.ValueKind != JsonValueKind.Object) return null;
        foreach (var property in element.EnumerateObject())
            if (property.Name.Equals(name, StringComparison.OrdinalIgnoreCase)) return property.Value;
        return null;
    }
    private static string? String(JsonElement e, string n) => Property(e, n) is { } v
        ? v.ValueKind == JsonValueKind.String ? v.GetString() : v.ToString() : null;
    private static decimal Decimal(JsonElement e, string n) => DecimalNullable(e, n) ?? 0;
    private static decimal? DecimalNullable(JsonElement e, string n) => Property(e, n) is { } v
        ? v.ValueKind == JsonValueKind.Number && v.TryGetDecimal(out var number) ? number
            : decimal.TryParse(v.ToString(), System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var parsed) ? parsed : null : null;
    private static int Int(JsonElement e, string n, int fallback = 0) => IntNullable(e, n) ?? fallback;
    private static int? IntNullable(JsonElement e, string n) => Property(e, n) is { } v && int.TryParse(v.ToString(), out var value) ? value : null;
    private static long? LongNullable(JsonElement e, string n) => Property(e, n) is { } v && long.TryParse(v.ToString(), out var value) ? value : null;
    private static string? FirstImage(JsonElement item)
    {
        if (Property(item, "mediumImageUrls") is not { ValueKind: JsonValueKind.Array } images) return null;
        foreach (var image in images.EnumerateArray())
        {
            var url = image.ValueKind == JsonValueKind.String ? image.GetString() : image.ValueKind == JsonValueKind.Object ? String(image, "imageUrl") : null;
            if (!string.IsNullOrWhiteSpace(url)) return url;
        }
        return null;
    }

    private static string Base64Url(string value) => Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(value)).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private sealed record ParsedResponse(int Count, int Page, int Hits, int PageCount, IReadOnlyList<ExternalCatalogProductDto> Items);
}
