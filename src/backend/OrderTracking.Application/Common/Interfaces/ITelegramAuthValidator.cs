namespace OrderTracking.Application.Common.Interfaces;

public interface ITelegramAuthValidator
{
    bool IsConfigured { get; }
    string? BotUsername { get; }

    /// <summary>Validates Telegram Login Widget payload. Returns error message or null if ok.</summary>
    string? Validate(TelegramLoginData data);
}
