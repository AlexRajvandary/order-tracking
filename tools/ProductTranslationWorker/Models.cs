using System.Text.Json.Serialization;

namespace ProductTranslationWorker;

public sealed record PendingProductDto(string Id, string Name);

public sealed record ProductTranslationResultDto(string Id, string NameRu);

public sealed record TranslationResponseDto(List<TranslationItemDto> Translations);

public sealed record TranslationItemDto(
    string Id,
    [property: JsonPropertyName("translation")] string TranslatedName);

public sealed record TranslationStatsDto(long Total, long Translated, long Remaining);

public sealed record SaveProductTranslationsRequest(IReadOnlyList<ProductTranslationResultDto> Items);

public sealed record SaveProductTranslationsResponse(int Requested, int Updated, int NotFound);

public sealed record PricingModel(string Name, decimal InputPerMillion, decimal OutputPerMillion);

public sealed record UsageDto(int PromptTokens, int CompletionTokens, int TotalTokens);

public sealed record LlmResponse(string Content, UsageDto? Usage);

public sealed class BackendOptions
{
    public string BaseUrl { get; set; } = "";
    public string PendingEndpoint { get; set; } = "";
    public string SaveEndpoint { get; set; } = "";
    public string StatsEndpoint { get; set; } = "";
    public int BatchSize { get; set; } = 50;
    public int RequestTimeoutSeconds { get; set; } = 30;
    public string ApiKey { get; set; } = "";
}

public sealed class LmStudioOptions
{
    public string BaseUrl { get; set; } = "http://localhost:1234/v1";
    public string Model { get; set; } = "";
    public int RequestTimeoutSeconds { get; set; } = 300;
    public double Temperature { get; set; } = .1;
}

public sealed class WorkerOptions
{
    public int BatchSize { get; set; } = 50;
    public int DelayBetweenBatchesMs { get; set; } = 500;
    public int MaxRetries { get; set; } = 3;
    public int RetryDelaySeconds { get; set; } = 3;
    public int DashboardRefreshMs { get; set; } = 500;
    public string StatsFilePath { get; set; } = "run-stats.json";
}

public sealed class PricingOptions
{
    public List<PricingModel> Models { get; set; } = [];
}

public sealed class ElectricityOptions
{
    public bool Enabled { get; set; }
    public double EstimatedSystemPowerWatts { get; set; }
    public decimal PricePerKwh { get; set; }
    public string Currency { get; set; } = "GBP";
}

public sealed class ProviderOptions
{
    public string BaseUrl { get; set; } = "";
    public string Model { get; set; } = "";
    public string ApiKey { get; set; } = "";
    public int BatchSize { get; set; } = 200;
    public int MaxConcurrency { get; set; } = 10;
}
