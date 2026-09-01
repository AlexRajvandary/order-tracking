namespace ProductTranslationWorker;

internal static class TranslationJson
{
    public static string ExtractArray(string raw)
    {
        var text = raw.Trim();
        var start = text.IndexOf('[');
        var end = text.LastIndexOf(']');
        if (start < 0 || end <= start)
            throw new InvalidDataException("Provider response does not contain a JSON array.");
        return text[start..(end + 1)];
    }
}
