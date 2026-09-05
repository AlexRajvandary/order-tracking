using OrderTracking.Infrastructure.TelegramBot.Notify;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Infrastructure.TelegramBot.Reports;
using OrderTracking.Infrastructure.TelegramBot.Routing;
using Telegram.Bot;
using Telegram.Bot.Types;

namespace OrderTracking.Infrastructure.TelegramBot;

public sealed class TelegramAdminBotService
{
    private readonly TelegramOrdersCsvService _csv;
    private readonly TelegramBotNotifier _notifier;
    private readonly TelegramBotUpdateRouter _router;
    private readonly TelegramBotRuntime _runtime;

    internal TelegramAdminBotService(
        TelegramBotRuntime runtime,
        TelegramBotUpdateRouter router,
        TelegramBotNotifier notifier,
        TelegramOrdersCsvService csv)
    {
        _runtime = runtime;
        _router = router;
        _notifier = notifier;
        _csv = csv;
    }

    public ITelegramBotClient? Client => _runtime.Client;

    public bool IsEnabled => _runtime.IsEnabled;

    public Task HandleUpdateAsync(Update update, CancellationToken cancellationToken) =>
        _router.HandleUpdateAsync(update, cancellationToken);

    public Task SendDailyOrdersCsvToAdminAsync(
        long telegramId,
        CancellationToken cancellationToken = default) =>
        _csv.SendDailyOrdersCsvToAdminAsync(telegramId, cancellationToken);

    internal Task<IReadOnlyList<(Guid AdminId, long TelegramId, string SettingsJson)>> GetDailyCsvRecipientsAsync(
        DateTime utcNow,
        CancellationToken cancellationToken) =>
        _csv.GetDailyCsvRecipientsAsync(utcNow, cancellationToken);

    internal async Task ProcessWorkItemAsync(TelegramWorkItem item, CancellationToken cancellationToken)
    {
        if (item is TelegramUpdateWorkItem update)
        {
            await HandleUpdateAsync(update.Update, cancellationToken);
        }
    }

    internal Task SendOrderCreatedNotifyAsync(
        Guid orderId,
        string trackingCode,
        string? customerName,
        string? phone,
        string? telegram,
        string? whatsApp,
        string? vk,
        string? address,
        IReadOnlyList<TelegramImageAttachment>? images,
        CancellationToken cancellationToken) =>
        _notifier.SendOrderCreatedAsync(
            orderId,
            trackingCode,
            customerName,
            phone,
            telegram,
            whatsApp,
            vk,
            address,
            images,
            cancellationToken);

    internal Task SendStatusPublishedNotifyAsync(
        TelegramStatusPublishedWorkItem item,
        CancellationToken cancellationToken) =>
        _notifier.SendStatusPublishedAsync(item, cancellationToken);

    internal Task SendProductImportCompletedNotifyAsync(
        int insertedCount,
        CancellationToken cancellationToken) =>
        _notifier.SendProductImportCompletedAsync(insertedCount, cancellationToken);

    internal Task SendCrawlerJobStartedNotifyAsync(
        string url,
        string category,
        CancellationToken cancellationToken) =>
        _notifier.SendCrawlerJobStartedAsync(url, category, cancellationToken);

    internal Task SendCrawlerJobFinishedNotifyAsync(
        int insertedCount,
        string category,
        CancellationToken cancellationToken) =>
        _notifier.SendCrawlerJobFinishedAsync(insertedCount, category, cancellationToken);
}
