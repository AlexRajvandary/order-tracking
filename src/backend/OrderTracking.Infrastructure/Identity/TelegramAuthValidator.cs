using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using OrderTracking.Application.Common.Interfaces;

namespace OrderTracking.Infrastructure.Identity;

public sealed class TelegramSettings
{
    public const string SectionName = "Telegram";

    public string? BotToken { get; set; }
    public string? BotUsername { get; set; }

    /// <summary>Max age of auth_date in seconds (default 1 day).</summary>
    public int AuthMaxAgeSeconds { get; set; } = 86400;
}

public sealed class TelegramAuthValidator : ITelegramAuthValidator
{
    private readonly TelegramSettings _settings;

    public TelegramAuthValidator(IOptions<TelegramSettings> settings)
    {
        _settings = settings.Value;
    }

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(_settings.BotToken)
        && !string.IsNullOrWhiteSpace(_settings.BotUsername);

    public string? BotUsername =>
        string.IsNullOrWhiteSpace(_settings.BotUsername) ? null : _settings.BotUsername.Trim().TrimStart('@');

    public string? Validate(TelegramLoginData data)
    {
        if (!IsConfigured)
        {
            return "Telegram login is not configured";
        }

        if (string.IsNullOrWhiteSpace(data.Hash))
        {
            return "Missing hash";
        }

        if (!string.IsNullOrWhiteSpace(data.MiniAppInitData))
        {
            return ValidateMiniAppData(data);
        }

        var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        if (data.AuthDate <= 0 || now - data.AuthDate > _settings.AuthMaxAgeSeconds)
        {
            return "Telegram authentication expired";
        }

        var pairs = new SortedDictionary<string, string>(StringComparer.Ordinal)
        {
            ["auth_date"] = data.AuthDate.ToString(),
            ["first_name"] = data.FirstName,
            ["id"] = data.Id.ToString(),
        };

        if (!string.IsNullOrEmpty(data.LastName))
        {
            pairs["last_name"] = data.LastName;
        }

        if (!string.IsNullOrEmpty(data.Username))
        {
            pairs["username"] = data.Username;
        }

        if (!string.IsNullOrEmpty(data.PhotoUrl))
        {
            pairs["photo_url"] = data.PhotoUrl;
        }

        var dataCheckString = string.Join('\n', pairs.Select(p => $"{p.Key}={p.Value}"));
        var secretKey = SHA256.HashData(Encoding.UTF8.GetBytes(_settings.BotToken!));
        var computedBytes = HMACSHA256.HashData(secretKey, Encoding.UTF8.GetBytes(dataCheckString));
        byte[] providedBytes;
        try
        {
            providedBytes = Convert.FromHexString(data.Hash.Trim());
        }
        catch (FormatException)
        {
            return "Invalid Telegram authentication hash";
        }

        if (providedBytes.Length != computedBytes.Length
            || !CryptographicOperations.FixedTimeEquals(computedBytes, providedBytes))
        {
            return "Invalid Telegram authentication hash";
        }

        return null;
    }

    public TelegramLoginData? ParseMiniAppInitData(string initData, out string? error)
    {
        error = null;
        if (string.IsNullOrWhiteSpace(initData) || initData.Length > 16_384)
        {
            error = "Missing or oversized Telegram Mini App initData";
            return null;
        }

        var fields = ParseQuery(initData);
        if (!fields.TryGetValue("hash", out var hash)
            || !fields.TryGetValue("auth_date", out var authDateRaw)
            || !long.TryParse(authDateRaw, out var authDate)
            || !fields.TryGetValue("user", out var userJson))
        {
            error = "Telegram Mini App initData is incomplete";
            return null;
        }

        try
        {
            using var user = JsonDocument.Parse(userJson);
            var root = user.RootElement;
            if (!root.TryGetProperty("id", out var idElement)
                || !idElement.TryGetInt64(out var id)
                || !root.TryGetProperty("first_name", out var firstNameElement)
                || firstNameElement.ValueKind != JsonValueKind.String)
            {
                error = "Telegram Mini App user data is incomplete";
                return null;
            }

            var firstName = firstNameElement.GetString() ?? string.Empty;
            var lastName = ReadOptionalString(root, "last_name");
            var username = ReadOptionalString(root, "username");
            var photoUrl = ReadOptionalString(root, "photo_url");
            return new TelegramLoginData(id, firstName, lastName, username, photoUrl, authDate, hash, initData);
        }
        catch (JsonException)
        {
            error = "Telegram Mini App user data is invalid";
            return null;
        }
    }

    private string? ValidateMiniAppData(TelegramLoginData data)
    {
        var fields = ParseQuery(data.MiniAppInitData!);
        if (!fields.TryGetValue("hash", out var receivedHash)
            || !fields.TryGetValue("auth_date", out var authDateRaw)
            || !long.TryParse(authDateRaw, out var authDate)
            || !fields.TryGetValue("user", out var userJson))
        {
            return "Telegram Mini App initData is incomplete";
        }

        var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        if (authDate <= 0 || now - authDate > _settings.AuthMaxAgeSeconds || authDate > now + 60)
        {
            return "Telegram authentication expired";
        }

        if (!string.Equals(receivedHash, data.Hash, StringComparison.OrdinalIgnoreCase)
            || !TryGetMiniAppUserId(userJson, out var userId)
            || userId != data.Id
            || authDate != data.AuthDate)
        {
            return "Telegram Mini App user data does not match initData";
        }

        fields.Remove("hash");
        var dataCheckString = string.Join('\n', fields.OrderBy(pair => pair.Key, StringComparer.Ordinal)
            .Select(pair => $"{pair.Key}={pair.Value}"));
        var secretKey = HMACSHA256.HashData(
            Encoding.UTF8.GetBytes("WebAppData"),
            Encoding.UTF8.GetBytes(_settings.BotToken!));
        var computedHash = HMACSHA256.HashData(secretKey, Encoding.UTF8.GetBytes(dataCheckString));
        byte[] providedHash;
        try
        {
            providedHash = Convert.FromHexString(receivedHash);
        }
        catch (FormatException)
        {
            return "Invalid Telegram authentication hash";
        }

        return providedHash.Length == computedHash.Length
               && CryptographicOperations.FixedTimeEquals(providedHash, computedHash)
            ? null
            : "Invalid Telegram authentication hash";
    }

    private static Dictionary<string, string> ParseQuery(string query)
    {
        var values = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var segment in query.Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var separator = segment.IndexOf('=');
            var rawKey = separator < 0 ? segment : segment[..separator];
            var rawValue = separator < 0 ? string.Empty : segment[(separator + 1)..];
            var key = Uri.UnescapeDataString(rawKey.Replace('+', ' '));
            var value = Uri.UnescapeDataString(rawValue.Replace('+', ' '));
            if (!values.TryAdd(key, value))
            {
                values.Remove(key);
                values[key] = value;
            }
        }

        return values;
    }

    private static bool TryGetMiniAppUserId(string json, out long id)
    {
        id = 0;
        try
        {
            using var user = JsonDocument.Parse(json);
            return user.RootElement.TryGetProperty("id", out var idElement)
                && idElement.TryGetInt64(out id);
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static string? ReadOptionalString(JsonElement element, string propertyName) =>
        element.TryGetProperty(propertyName, out var property) && property.ValueKind == JsonValueKind.String
            ? property.GetString()
            : null;
}
