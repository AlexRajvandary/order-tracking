using System.Text.Json;

namespace ProductTranslationWorker;

public sealed class LmStudioTranslationProvider(LmStudioClient client) : ITranslationProvider
{
    public string Name => "LM Studio";
    public string Model => client.Model;

    public async Task<IReadOnlyList<ProductTranslationResultDto>> TranslateAsync(
        IReadOnlyList<PendingProductDto> products,
        CancellationToken cancellationToken)
    {
        var response = await client.TranslateAsync(products, cancellationToken);
        var json = TranslationJson.ExtractArray(response.Content);
        var result = JsonSerializer.Deserialize<List<ProductTranslationResultDto>>(json)
                     ?? throw new InvalidDataException("Invalid LM Studio JSON");
        var validated = TranslationValidation.Validate(products, result);
        TranslationLogging.LogTranslations(Name, validated);
        return validated;
    }
}
