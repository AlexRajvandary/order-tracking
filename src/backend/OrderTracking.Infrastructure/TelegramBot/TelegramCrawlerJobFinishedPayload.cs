namespace OrderTracking.Infrastructure.TelegramBot;

internal sealed record TelegramCrawlerJobFinishedPayload(
    Guid JobId,
    int InsertedCount,
    string Category);
