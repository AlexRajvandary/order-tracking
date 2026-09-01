using System.Text.Json;

namespace ProductTranslationWorker;

public sealed class OpenAiTranslationProvider(
    HttpClient http,
    string model,
    string apiKey) : OpenAiCompatibleTranslationProvider(http, "OpenAI", model, apiKey)
{
    protected override Dictionary<string, object?> CreatePayload(IReadOnlyList<PendingProductDto> products)
    {
        var payload = base.CreatePayload(products);
        payload.Remove("temperature");
        if (Model.StartsWith("gpt-5", StringComparison.OrdinalIgnoreCase))
            payload["reasoning_effort"] = "minimal";
        payload["response_format"] = new
        {
            type = "json_schema",
            json_schema = new
            {
                name = "product_translations",
                strict = true,
                schema = new
                {
                    type = "object",
                    properties = new
                    {
                        translations = new
                        {
                            type = "array",
                            minItems = products.Count,
                            maxItems = products.Count,
                            items = new
                            {
                                type = "object",
                                properties = new
                                {
                                    id = new { type = "string" },
                                    translation = new { type = "string" }
                                },
                                required = new[] { "id", "translation" },
                                additionalProperties = false
                            }
                        }
                    },
                    required = new[] { "translations" },
                    additionalProperties = false
                }
            }
        };
        return payload;
    }

    public override async Task<IReadOnlyList<ProductTranslationResultDto>> TranslateAsync(
        IReadOnlyList<PendingProductDto> products,
        CancellationToken cancellationToken)
    {
        EnsureApiKey();
        var payload = CreatePayload(products);
        using var response = await SendAsync(payload, cancellationToken);
        using var document = await ReadDocumentAsync(response, cancellationToken);
        TranslationLogging.LogUsage(Name, document.RootElement, products.Count);
        var structured = JsonSerializer.Deserialize<TranslationResponseDto>(GetContent(document));
        var result = structured?.Translations?
            .Select(x => new ProductTranslationResultDto(x.Id, x.TranslatedName))
            .ToList();
        var validated = TranslationValidation.Validate(products, result);
        TranslationLogging.LogTranslations(Name, validated);
        return validated;
    }
}
