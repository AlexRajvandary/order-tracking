using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ProductTranslationJobsWorker;

public sealed class ProductsClient
{
    private static readonly JsonSerializerOptions JsonOptions = CreateJsonOptions();

    private readonly HttpClient _httpClient;

    private readonly TranslationJobsOptions _options;

    private readonly ILogger<ProductsClient> _logger;

    public ProductsClient(
        HttpClient httpClient,
        IOptions<TranslationJobsOptions> options,
        ILogger<ProductsClient> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<IReadOnlyList<TranslationSourceDto>> GetSourceAsync(
        IReadOnlyList<Guid> ids,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "worker/products/source");
        request.Headers.Add("X-Translation-Worker-Key", _options.WorkerApiKey);
        request.Content = JsonContent.Create(new { ids }, options: JsonOptions);
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        await EnsureSuccessAsync(response, cancellationToken);
        return await response.Content.ReadFromJsonAsync<List<TranslationSourceDto>>(JsonOptions, cancellationToken)
            ?? [];
    }

    public async Task SaveTranslationsAsync(
        IReadOnlyList<SaveTranslationItem> items,
        bool onlyIfUntranslated,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Put, "worker/products/translations");
        request.Headers.Add("X-Translation-Worker-Key", _options.WorkerApiKey);
        request.Content = JsonContent.Create(
            new SaveTranslationRequest(items, onlyIfUntranslated),
            options: JsonOptions);
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        await EnsureSuccessAsync(response, cancellationToken);
    }

    private async Task EnsureSuccessAsync(
        HttpResponseMessage response,
        CancellationToken cancellationToken)
    {
        if (response.IsSuccessStatusCode)
        {
            return;
        }

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        _logger.LogError(
            "Products API returned {StatusCode}: {Body}",
            (int)response.StatusCode,
            body.Length > 1000 ? body[..1000] : body);
        throw new HttpRequestException($"Products API returned {(int)response.StatusCode}.");
    }

    private static JsonSerializerOptions CreateJsonOptions()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        options.Converters.Add(new JsonStringEnumConverter());
        return options;
    }
}
