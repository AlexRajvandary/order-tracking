namespace OrderTracking.Infrastructure.TelegramBot;

internal static class TelegramOutboxDedupKeys
{
    public static string StatusHistory(Guid statusHistoryId) => statusHistoryId.ToString("N");

    public static string DailyCsv(Guid adminId, DateOnly date) =>
        $"csv:{adminId:N}:{date:yyyy-MM-dd}";
}
