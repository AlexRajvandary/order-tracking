namespace ProductTranslationJobsWorker;

public static class TranslationValidation
{
    public static IReadOnlyList<SaveTranslationItem> SelectUnambiguousValid(
        IReadOnlyList<TranslationSourceDto> requested,
        IReadOnlyList<ProductTranslationItem>? translations)
    {
        if (translations is null)
        {
            return [];
        }

        var expected = requested.Select(x => x.Id).ToHashSet();
        return translations
            .Where(x => x is not null
                && Guid.TryParse(x.Id, out var id)
                && expected.Contains(id)
                && !string.IsNullOrWhiteSpace(x.Translation))
            .GroupBy(x => Guid.Parse(x.Id!))
            .Where(x => x.Count() == 1)
            .Select(x => new SaveTranslationItem(x.Key, x.Single().Translation!.Trim()))
            .ToList();
    }

    public static IReadOnlyList<SaveTranslationItem> Validate(
        IReadOnlyList<TranslationSourceDto> requested,
        IReadOnlyList<ProductTranslationItem>? translations)
    {
        if (translations is null || translations.Count != requested.Count)
        {
            throw new InvalidDataException("OpenAI returned an incorrect number of translations.");
        }

        var expected = requested.Select(x => x.Id).ToHashSet();
        var result = new List<SaveTranslationItem>(translations.Count);
        var returned = new HashSet<Guid>();
        foreach (var item in translations)
        {
            if (item is null
                || !Guid.TryParse(item.Id, out var id)
                || !expected.Contains(id)
                || !returned.Add(id)
                || string.IsNullOrWhiteSpace(item.Translation))
            {
                throw new InvalidDataException("OpenAI returned duplicate, unknown or empty translation data.");
            }

            result.Add(new SaveTranslationItem(id, item.Translation.Trim()));
        }

        if (returned.Count != expected.Count)
        {
            throw new InvalidDataException("OpenAI response does not contain every requested product ID.");
        }

        return result;
    }
}
