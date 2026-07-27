namespace OrderTracking.Infrastructure.TelegramBot;

internal sealed record TelegramStatusPublishedPayload(
    Guid OrderId,
    string TrackingCode,
    string StatusText,
    string? OrderItemName,
    string? Country,
    string? Location,
    Guid StatusHistoryId);
