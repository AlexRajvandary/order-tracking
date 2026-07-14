using System.Security.Cryptography;
using System.Text;
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
}
