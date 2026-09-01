using System.Text.Json;

namespace ProductTranslationWorker;

internal static class TranslationPrompt
{
    public const string SystemMessage =
        "Translate Japanese ecommerce product names into natural Russian. Return exactly one concise and natural Russian translation for every supplied product ID. Preserve brand names, model names, SKUs, article numbers, numbers, sizes and units. Do not invent, infer or add characteristics that are not explicitly present in the original product name. Prefer semantic accuracy over literal word-for-word translation. Translate generic fashion terms into natural Russian rather than leaving them in English.";

    public static string Build(IReadOnlyList<PendingProductDto> products) =>
        JsonSerializer.Serialize(products);
}
