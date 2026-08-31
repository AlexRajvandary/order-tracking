using System.Net.Http.Json;
using System.Text.Json;

namespace ProductTranslationWorker;

public sealed class LmStudioClient(HttpClient http, Microsoft.Extensions.Options.IOptions<LmStudioOptions> options)
{
    private readonly LmStudioOptions o = options.Value;

    public string Model => o.Model;

    public async Task<LlmResponse> TranslateAsync(IReadOnlyList<PendingProductDto> products, CancellationToken ct)
    {
        var prompt = "Translate Japanese e-commerce titles to natural Russian. Preserve IDs, brands, models and sizes. Return only a JSON array with id and nameRu, exactly one item per input, no markdown or explanations.\nINPUT:\n" + JsonSerializer.Serialize(products);
        using var response = await http.PostAsJsonAsync("chat/completions", new { model = o.Model, temperature = o.Temperature, messages = new[] { new { role = "system", content = "You are a professional Japanese to Russian product title translator." }, new { role = "user", content = prompt } } }, ct); response.EnsureSuccessStatusCode();
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct)); var content = doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString() ?? ""; UsageDto? usage = null; if (doc.RootElement.TryGetProperty("usage", out var u)) usage = new(u.GetProperty("prompt_tokens").GetInt32(), u.GetProperty("completion_tokens").GetInt32(), u.GetProperty("total_tokens").GetInt32()); return new(content, usage);
    }
}
