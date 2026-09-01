namespace ProductTranslationWorker;

internal static class TranslationValidation
{
    public static IReadOnlyList<ProductTranslationResultDto> Validate(
        IReadOnlyList<PendingProductDto> requested,
        IReadOnlyList<ProductTranslationResultDto>? result)
    {
        if (result is null || result.Count != requested.Count)
            throw new InvalidDataException("Translation count does not match the requested batch.");

        var expected = requested.Select(x => x.Id).ToHashSet(StringComparer.Ordinal);
        if (result.Any(x => x is null || string.IsNullOrWhiteSpace(x.Id) || string.IsNullOrWhiteSpace(x.NameRu)))
            throw new InvalidDataException("Translation response contains an empty item.");
        var returned = result.Select(x => x!.Id).ToList();
        if (returned.Count != returned.Distinct(StringComparer.Ordinal).Count())
            throw new InvalidDataException("Translation response contains duplicate IDs.");
        if (!expected.SetEquals(returned))
            throw new InvalidDataException("Translation response contains unexpected or missing IDs.");

        return result;
    }
}
