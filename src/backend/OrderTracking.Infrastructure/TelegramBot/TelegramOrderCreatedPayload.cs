namespace OrderTracking.Infrastructure.TelegramBot;

internal sealed record TelegramOrderCreatedPayload(
    Guid OrderId,
    string TrackingCode,
    string? CustomerName);
