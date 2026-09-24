using System.Text.Json.Serialization;

namespace ZozoEnrichmentTester.Models;

public sealed class ZozoMainVisualResponse
{
    [JsonPropertyName("images")] public List<ZozoImage> Images { get; set; } = [];
    [JsonPropertyName("movies")] public List<object> Movies { get; set; } = [];
}

public sealed class ZozoImage
{
    [JsonPropertyName("type")] public string? Type { get; set; }
    [JsonPropertyName("original_url")] public string? OriginalUrl { get; set; }
    [JsonPropertyName("color_id")] public long? ColorId { get; set; }
    [JsonPropertyName("color_name")] public string? ColorName { get; set; }
}

public sealed class ZozoSizeResponse
{
    [JsonPropertyName("goods_sizes")] public List<ZozoSizeItem> GoodsSizes { get; set; } = [];
}

public sealed class ZozoSizeItem
{
    [JsonPropertyName("size_id")] public long SizeId { get; set; }
    [JsonPropertyName("size_name")] public string? SizeName { get; set; }
    [JsonPropertyName("size_short_name")] public string? SizeShortName { get; set; }
    [JsonPropertyName("color_id")] public long? ColorId { get; set; }
    [JsonPropertyName("color_name")] public string? ColorName { get; set; }
    [JsonPropertyName("is_available")] public bool? IsAvailable { get; set; }
    [JsonPropertyName("specs")] public System.Text.Json.JsonElement Specs { get; set; }
}

public sealed class BrowserFetchResult
{
    [JsonPropertyName("status")] public int Status { get; set; }
    [JsonPropertyName("text")] public string Text { get; set; } = "";

    public bool IsBlocked => Status == 403
        || Text.Contains("Access Denied", StringComparison.OrdinalIgnoreCase)
        || Text.Contains("edgesuite.net", StringComparison.OrdinalIgnoreCase)
        || (Text.Length < 20_000 && Text.Contains("Akamai", StringComparison.OrdinalIgnoreCase));
}

public sealed record BrowserSessionDiagnostics(
    int ContextCount,
    int PageCount,
    string SelectedPageUrl,
    bool ZozoUidPresent,
    IReadOnlyList<CookieMetadata> Cookies);

public sealed record CookieMetadata(string Name, string Domain, string Path);

public sealed record KnownBffDiagnostics(int Status, int ResponseLength, int ImagesCount)
{
    public bool Passed => Status == 200 && ImagesCount > 0;
}

public sealed record ProductPageResult(
    int? Status,
    string Title,
    string FinalUrl,
    string Html,
    string? NextData)
{
    public bool IsBlocked => Status == 403
        || Title.Contains("Access Denied", StringComparison.OrdinalIgnoreCase)
        || Html.Contains("Access Denied", StringComparison.OrdinalIgnoreCase)
        || Html.Contains("edgesuite.net", StringComparison.OrdinalIgnoreCase)
        || (Html.Length < 20_000 && Html.Contains("Akamai", StringComparison.OrdinalIgnoreCase));
}
