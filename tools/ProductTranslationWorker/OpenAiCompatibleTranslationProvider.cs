using System.Net.Http.Json;
using System.Text.Json;

namespace ProductTranslationWorker;

public class OpenAiCompatibleTranslationProvider(
    HttpClient http,
    string name,
    string model,
    string apiKey) : ITranslationProvider
{
    public virtual string Name => name;
    public string Model => model;

    public virtual async Task<IReadOnlyList<ProductTranslationResultDto>> TranslateAsync(
        IReadOnlyList<PendingProductDto> products,
        CancellationToken cancellationToken)
    {
        EnsureApiKey();
        var payload = CreatePayload(products);
        using var response = await SendAsync(payload, cancellationToken);
        using var document = await ReadDocumentAsync(response, cancellationToken);
        TranslationLogging.LogUsage(Name, document.RootElement, products.Count);
        var content = GetContent(document);
        var json = TranslationJson.ExtractArray(content);
        var result = JsonSerializer.Deserialize<List<ProductTranslationResultDto>>(json)
                     ?? throw new InvalidDataException($"Invalid {Name} JSON");
        var validated = TranslationValidation.Validate(products, result);
        TranslationLogging.LogTranslations(Name, validated);
        return validated;
    }

    public virtual async Task CheckConnectionAsync(CancellationToken cancellationToken)
    {
        EnsureApiKey();
        using var request = new HttpRequestMessage(HttpMethod.Get, "models");
        request.Headers.Authorization = new("Bearer", apiKey);
        using var response = await http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"{Name} connection check failed: HTTP {(int)response.StatusCode}: {body}");
    }

    protected virtual Dictionary<string, object?> CreatePayload(IReadOnlyList<PendingProductDto> products) =>
        new()
        {
            ["model"] = model,
            ["messages"] = new[]
            {
                new { role = "system", content = TranslationPrompt.SystemMessage },
                new { role = "user", content = TranslationPrompt.Build(products) }
            },
            ["temperature"] = 0.1
        };

    protected async Task<HttpResponseMessage> SendAsync(
        Dictionary<string, object?> payload,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "chat/completions");
        request.Headers.Authorization = new("Bearer", apiKey);
        request.Content = JsonContent.Create(payload);
        var response = await http.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            var statusCode = (int)response.StatusCode;
            response.Dispose();
            throw new HttpRequestException($"{Name} API error: HTTP {statusCode}: {body}");
        }
        return response;
    }

    protected static async Task<JsonDocument> ReadDocumentAsync(HttpResponseMessage response, CancellationToken cancellationToken) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));

    protected static string GetContent(JsonDocument document) =>
        document.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString()
        ?? throw new InvalidDataException("Provider response content is empty.");

    protected void EnsureApiKey()
    {
        if (string.IsNullOrWhiteSpace(apiKey))
            throw new InvalidOperationException($"{Name} API key is not configured");
    }
}
