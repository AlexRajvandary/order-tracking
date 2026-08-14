namespace OrderTracking.Domain.Enums;

public static class TelegramOutboxKinds
{
    public const string OrderCreated = "order_created";
    public const string StatusPublished = "status_published";
    public const string DailyOrdersCsv = "daily_orders_csv";
    public const string ProductImportCompleted = "product_import_completed";
    public const string CrawlerJobStarted = "crawler_job_started";
    public const string CrawlerJobFinished = "crawler_job_finished";
}
