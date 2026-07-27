using System.Text.Json;

namespace OrderTracking.Infrastructure.TelegramBot;

internal sealed class TelegramBotUserSettings
{
    public bool DailyOrdersCsvEnabled { get; set; }
    public int DailyOrdersCsvHourUtc { get; set; } = 6;
    public string? DailyOrdersCsvLastSentDate { get; set; }

    public static TelegramBotUserSettings FromJson(string? settingsJson)
    {
        if (string.IsNullOrWhiteSpace(settingsJson))
        {
            return new TelegramBotUserSettings();
        }

        try
        {
            using var doc = JsonDocument.Parse(settingsJson);
            if (!doc.RootElement.TryGetProperty("telegramBot", out var bot))
            {
                return new TelegramBotUserSettings();
            }

            return new TelegramBotUserSettings
            {
                DailyOrdersCsvEnabled = bot.TryGetProperty("dailyOrdersCsvEnabled", out var en) && en.ValueKind == JsonValueKind.True,
                DailyOrdersCsvHourUtc = bot.TryGetProperty("dailyOrdersCsvHourUtc", out var hour) && hour.TryGetInt32(out var h)
                    ? Math.Clamp(h, 0, 23)
                    : 6,
                DailyOrdersCsvLastSentDate = bot.TryGetProperty("dailyOrdersCsvLastSentDate", out var d) && d.ValueKind == JsonValueKind.String
                    ? d.GetString()
                    : null,
            };
        }
        catch (JsonException)
        {
            return new TelegramBotUserSettings();
        }
    }

    public static string MergeInto(string? settingsJson, TelegramBotUserSettings botSettings)
    {
        Dictionary<string, JsonElement> root;
        try
        {
            root = string.IsNullOrWhiteSpace(settingsJson)
                ? new Dictionary<string, JsonElement>()
                : JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(settingsJson)
                  ?? new Dictionary<string, JsonElement>();
        }
        catch
        {
            root = new Dictionary<string, JsonElement>();
        }

        var botObj = new Dictionary<string, object?>
        {
            ["dailyOrdersCsvEnabled"] = botSettings.DailyOrdersCsvEnabled,
            ["dailyOrdersCsvHourUtc"] = botSettings.DailyOrdersCsvHourUtc,
            ["dailyOrdersCsvLastSentDate"] = botSettings.DailyOrdersCsvLastSentDate,
        };

        root["telegramBot"] = JsonSerializer.SerializeToElement(botObj);
        return JsonSerializer.Serialize(root);
    }
}
