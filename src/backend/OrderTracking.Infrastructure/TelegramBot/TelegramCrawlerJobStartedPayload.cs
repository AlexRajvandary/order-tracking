namespace OrderTracking.Infrastructure.TelegramBot;

internal sealed record TelegramCrawlerJobStartedPayload(
    Guid JobId,
    string Url,
    string Category);
