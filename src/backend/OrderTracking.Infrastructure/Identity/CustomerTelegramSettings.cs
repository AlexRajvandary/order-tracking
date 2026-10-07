namespace OrderTracking.Infrastructure.Identity;

public sealed class CustomerTelegramSettings
{
    public const string SectionName = "CustomerTelegram";
    public string BotToken { get; set; } = string.Empty;
    public string BotUsername { get; set; } = string.Empty;
    public string LoginClientId { get; set; } = string.Empty;
    public string LoginClientSecret { get; set; } = string.Empty;
    public string LoginRedirectUri { get; set; } = string.Empty;
}
