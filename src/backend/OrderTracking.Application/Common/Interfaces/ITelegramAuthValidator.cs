namespace OrderTracking.Application.Common.Interfaces;

public interface ITelegramAuthValidator
{
    bool IsConfigured { get; }
    string? BotUsername { get; }

    /// <summary>Validates Telegram Login Widget payload. Returns error message or null if ok.</summary>
    string? Validate(TelegramLoginData data);
}

public sealed record TelegramLoginData(
    long Id,
    string FirstName,
    string? LastName,
    string? Username,
    string? PhotoUrl,
    long AuthDate,
    string Hash);
