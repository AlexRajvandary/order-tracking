using System.Text.Json;

namespace ProductTranslationWorker;

internal static class TranslationLogging
{
    public static void LogUsage(string provider, JsonElement root, int productCount)
    {
        var input = Get(root, "prompt_tokens");
        var output = Get(root, "completion_tokens");
        var total = Get(root, "total_tokens");
        var reasoning = "unknown";
        if (root.TryGetProperty("completion_tokens_details", out var details))
            reasoning = Get(details, "reasoning_tokens");
        Console.WriteLine($"[{provider}] input={input}; output={output}; reasoning={reasoning}; total={total}; products={productCount}");
    }

    public static void LogTranslations(string provider, IReadOnlyList<ProductTranslationResultDto> translations)
    {
        foreach (var translation in translations)
            Console.WriteLine($"[{provider}] translation: id={translation.Id}; translated_name={translation.NameRu}");
    }

    private static string Get(JsonElement element, string propertyName) =>
        element.TryGetProperty(propertyName, out var value) ? value.ToString() : "unknown";
}
