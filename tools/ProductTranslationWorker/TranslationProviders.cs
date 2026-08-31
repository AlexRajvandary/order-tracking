namespace ProductTranslationWorker;

internal static class TranslationJson
{
    public static string ExtractArray(string raw)
    {
        var text = raw.Trim();
        if (text.StartsWith("```", StringComparison.Ordinal))
        {
            var firstNewLine = text.IndexOf('\n');
            if (firstNewLine >= 0)
                text = text[(firstNewLine + 1)..];
            var fence = text.LastIndexOf("```", StringComparison.Ordinal);
            if (fence >= 0)
                text = text[..fence];
        }

        var start = text.IndexOf('[');
        var end = text.LastIndexOf(']');
        if (start < 0 || end <= start)
            throw new InvalidDataException("Provider response does not contain a JSON array.");

        return text[start..(end + 1)].Trim();
    }
}
public interface ITranslationProvider { string Name { get; } string Model { get; } Task<IReadOnlyList<ProductTranslationResultDto>> TranslateAsync(IReadOnlyList<PendingProductDto> products, CancellationToken cancellationToken); }
public sealed class LmStudioTranslationProvider(LmStudioClient client) : ITranslationProvider { public string Name => "LM Studio"; public string Model => client.Model; public async Task<IReadOnlyList<ProductTranslationResultDto>> TranslateAsync(IReadOnlyList<PendingProductDto> products, CancellationToken ct) { var r = await client.TranslateAsync(products, ct); var text = TranslationJson.ExtractArray(r.Content); return System.Text.Json.JsonSerializer.Deserialize<List<ProductTranslationResultDto>>(text) ?? throw new InvalidDataException("Invalid LM Studio JSON"); } }
public sealed class CloudTranslationProvider(HttpClient http, string name, string model, string apiKey) : ITranslationProvider
{
    public string Name => name; public string Model => model;
    public async Task<IReadOnlyList<ProductTranslationResultDto>> TranslateAsync(IReadOnlyList<PendingProductDto> products, CancellationToken ct) { if (string.IsNullOrWhiteSpace(apiKey)) throw new InvalidOperationException($"{name} API key is not configured"); var prompt = "Translate Japanese product names into natural Russian for an ecommerce catalog. Preserve brand names, model names, SKU/article numbers, sizes, numbers and units. Do not invent characteristics. Return one translation for every supplied product ID. INPUT:\n" + System.Text.Json.JsonSerializer.Serialize(products); using var req = new HttpRequestMessage(HttpMethod.Post, "chat/completions"); req.Headers.Authorization = new("Bearer", apiKey); var payload = new Dictionary<string, object?> { { "model", model }, { "messages", new[] { new { role = "system", content = "You translate Japanese e-commerce product names into Russian." }, new { role = "user", content = prompt } } } }; if (name.Equals("OpenAI", StringComparison.OrdinalIgnoreCase)) payload["response_format"] = new Dictionary<string, object?> { { "type", "json_schema" }, { "json_schema", new Dictionary<string, object?> { { "name", "product_translations" }, { "strict", true }, { "schema", new Dictionary<string, object?> { { "type", "object" }, { "properties", new Dictionary<string, object?> { { "translations", new Dictionary<string, object?> { { "type", "array" }, { "items", new Dictionary<string, object?> { { "type", "object" }, { "properties", new Dictionary<string, object?> { { "id", new Dictionary<string, string> { { "type", "string" } } }, { "translatedName", new Dictionary<string, string> { { "type", "string" } } } } }, { "required", new[] { "id", "translatedName" } }, { "additionalProperties", false } } } } } } }, { "required", new[] { "translations" } }, { "additionalProperties", false } } } } } }; else if (!model.StartsWith("gpt-5", StringComparison.OrdinalIgnoreCase)) payload["temperature"] = 0.1; req.Content = System.Net.Http.Json.JsonContent.Create(payload); using var res = await http.SendAsync(req, ct); var responseText = await res.Content.ReadAsStringAsync(ct); if (!res.IsSuccessStatusCode) throw new HttpRequestException($"{name} API {(int)res.StatusCode}: {responseText}"); using var doc = System.Text.Json.JsonDocument.Parse(responseText); var text = doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString() ?? ""; if (name.Equals("OpenAI", StringComparison.OrdinalIgnoreCase)) { var structured = System.Text.Json.JsonSerializer.Deserialize<TranslationResponseDto>(text); if (structured?.Translations is not { } translations) throw new InvalidDataException("OpenAI structured output does not contain translations"); if (translations.Any(x => x is null || string.IsNullOrWhiteSpace(x.Id) || string.IsNullOrWhiteSpace(x.TranslatedName))) throw new InvalidDataException("OpenAI structured output contains an empty translation"); return translations.Select(x => new ProductTranslationResultDto(x.Id, x.TranslatedName)).ToList(); } text = TranslationJson.ExtractArray(text); return System.Text.Json.JsonSerializer.Deserialize<List<ProductTranslationResultDto>>(text) ?? throw new InvalidDataException("Invalid provider JSON"); }
}
