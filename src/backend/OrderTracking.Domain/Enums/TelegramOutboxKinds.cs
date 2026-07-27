namespace OrderTracking.Domain.Enums;

public static class TelegramOutboxKinds
{
    public const string OrderCreated = "order_created";
    public const string StatusPublished = "status_published";
    public const string DailyOrdersCsv = "daily_orders_csv";
}
