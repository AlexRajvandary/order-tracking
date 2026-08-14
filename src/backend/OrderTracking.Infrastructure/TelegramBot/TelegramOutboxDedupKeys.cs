namespace OrderTracking.Infrastructure.TelegramBot;

internal static class TelegramOutboxDedupKeys
{
    public static string StatusHistory(Guid statusHistoryId) => statusHistoryId.ToString("N");

    public static string DailyCsv(Guid adminId, DateOnly date) =>
        $"csv:{adminId:N}:{date:yyyy-MM-dd}";

    public static string ProductImport(Guid importId) => $"product-import:{importId:N}";

    public static string CrawlerJobStarted(Guid jobId) => $"crawler-started:{jobId:N}";

    public static string CrawlerJobFinished(Guid jobId) => $"crawler-finished:{jobId:N}";
}
