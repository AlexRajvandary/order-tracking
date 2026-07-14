using System.Text.Json;

namespace OrderTracking.Application.Identity;

internal static class UserSettingsHelper
{
    private static readonly JsonElement EmptyObject = JsonSerializer.SerializeToElement(new { });

    public static JsonElement Parse(string? settingsJson)
    {
        if (string.IsNullOrWhiteSpace(settingsJson))
        {
            return EmptyObject.Clone();
        }

        try
        {
            using var document = JsonDocument.Parse(settingsJson);
            if (document.RootElement.ValueKind != JsonValueKind.Object)
            {
                return EmptyObject.Clone();
            }

            return document.RootElement.Clone();
        }
        catch (JsonException)
        {
            return EmptyObject.Clone();
        }
    }

    public static string Serialize(JsonElement settings)
    {
        if (settings.ValueKind != JsonValueKind.Object)
        {
            throw new ArgumentException("Settings must be a JSON object.", nameof(settings));
        }

        var raw = settings.GetRawText();
        if (raw.Length > 32_768)
        {
            throw new ArgumentException("Settings payload is too large.", nameof(settings));
        }

        return raw;
    }
}
