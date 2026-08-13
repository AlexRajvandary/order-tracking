namespace OrderTracking.Infrastructure.TelegramBot;

internal sealed record TelegramProductImportCompletedPayload(
    Guid ImportId,
    int InsertedCount);
