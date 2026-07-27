namespace OrderTracking.Infrastructure.TelegramBot;

internal sealed record TelegramDailyOrdersCsvPayload(
    Guid AdminId,
    long TelegramId,
    string Date);
