namespace OrderTracking.Application.Orders.AiParse;

public static class AiOrderParseLimits
{
    public const long MaxImageBytes = 10 * 1024 * 1024; // 10 MB

    public static readonly HashSet<string> AllowedImageContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp",
    };

    public static string NormalizeContentType(string? contentType)
    {
        if (string.IsNullOrWhiteSpace(contentType))
        {
            return string.Empty;
        }

        var normalized = contentType.Split(';', 2)[0].Trim();
        return string.Equals(normalized, "image/jpg", StringComparison.OrdinalIgnoreCase)
            ? "image/jpeg"
            : normalized;
    }

    public static bool IsAllowedImageContentType(string? contentType) =>
        AllowedImageContentTypes.Contains(NormalizeContentType(contentType));
}
