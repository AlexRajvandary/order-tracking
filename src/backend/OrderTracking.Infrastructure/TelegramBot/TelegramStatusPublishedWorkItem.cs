namespace OrderTracking.Infrastructure.TelegramBot;

internal sealed record TelegramStatusPublishedWorkItem(
    Guid OrderId,
    string TrackingCode,
    string StatusText,
    string? OrderItemName,
    string? Country,
    string? Location,
    Guid StatusHistoryId);
