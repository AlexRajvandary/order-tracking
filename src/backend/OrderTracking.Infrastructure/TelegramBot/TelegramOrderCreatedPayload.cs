namespace OrderTracking.Infrastructure.TelegramBot;

internal sealed record TelegramOrderCreatedPayload(
    Guid OrderId,
    string TrackingCode,
    string? CustomerName,
    string? Phone,
    string? Telegram,
    string? WhatsApp,
    string? Vk,
    string? Address);
