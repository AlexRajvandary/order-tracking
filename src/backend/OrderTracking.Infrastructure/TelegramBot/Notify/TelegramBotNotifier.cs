using System.Text;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Domain.Enums;
using Telegram.Bot;
using Telegram.Bot.Types.Enums;
using Telegram.Bot.Types.ReplyMarkups;

namespace OrderTracking.Infrastructure.TelegramBot.Notify;

internal sealed class TelegramBotNotifier
{
    private readonly ILogger<TelegramBotNotifier> _logger;
    private readonly TelegramBotRuntime _runtime;

    public TelegramBotNotifier(TelegramBotRuntime runtime, ILogger<TelegramBotNotifier> logger)
    {
        _runtime = runtime;
        _logger = logger;
    }

    public async Task SendOrderCreatedAsync(
        Guid orderId,
        string trackingCode,
        string? customerName,
        CancellationToken cancellationToken)
    {
        if (!_runtime.IsEnabled || _runtime.Client is null)
        {
            return;
        }

        var bot = _runtime.Client;
        var recipients = await GetRecipientTelegramIdsAsync(cancellationToken);
        if (recipients.Count == 0)
        {
            return;
        }

        var text =
            $"<b>Новый заказ</b>\n" +
            $"Код: <code>{TelegramBotText.Escape(trackingCode)}</code>\n" +
            $"Клиент: {TelegramBotText.Escape(customerName)}\n" +
            $"Id: <code>{orderId}</code>";

        var keyboard = new InlineKeyboardMarkup(
            InlineKeyboardButton.WithCallbackData(
                "Открыть заказ",
                TelegramBotCallback.OrderOpen(orderId)));

        foreach (var chatId in recipients)
        {
            try
            {
                await bot.SendMessage(chatId, text, ParseMode.Html, replyMarkup: keyboard, cancellationToken: cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to notify Telegram chat {ChatId} about new order", chatId);
            }
        }
    }

    public async Task SendStatusPublishedAsync(
        TelegramStatusPublishedWorkItem item,
        CancellationToken cancellationToken)
    {
        if (!_runtime.IsEnabled || _runtime.Client is null)
        {
            return;
        }

        var bot = _runtime.Client;
        var recipients = await GetRecipientTelegramIdsAsync(cancellationToken);
        if (recipients.Count == 0)
        {
            throw new InvalidOperationException("No active admins with Telegram linked for status notify");
        }

        if (!await TryClaimStatusHistoryNotifyAsync(item.StatusHistoryId, cancellationToken))
        {
            var dedupKey = TelegramOutboxDedupKeys.StatusHistory(item.StatusHistoryId);
            if (await HasSentOutboxAsync(dedupKey, cancellationToken))
            {
                return;
            }

            // Stale claim after crash before Sent — clear and reclaim.
            await ClearStatusHistoryNotifyClaimAsync(item.StatusHistoryId, cancellationToken);
            if (!await TryClaimStatusHistoryNotifyAsync(item.StatusHistoryId, cancellationToken))
            {
                if (await HasSentOutboxAsync(dedupKey, cancellationToken))
                {
                    return;
                }

                throw new InvalidOperationException(
                    "Status notify claim is held without a Sent outbox row; will retry");
            }
        }

        try
        {
            var sb = new StringBuilder();
            sb.AppendLine("📣 <b>Статус опубликован</b>");
            sb.AppendLine($"Заказ: <code>{TelegramBotText.Escape(item.TrackingCode)}</code>");
            if (!string.IsNullOrWhiteSpace(item.OrderItemName))
            {
                sb.AppendLine($"Позиция: {TelegramBotText.Escape(item.OrderItemName)}");
            }

            sb.AppendLine($"Статус: <b>{TelegramBotText.Escape(item.StatusText)}</b>");
            if (!string.IsNullOrWhiteSpace(item.Country) || !string.IsNullOrWhiteSpace(item.Location))
            {
                sb.AppendLine($"Где: {TelegramBotText.Escape(string.Join(", ", new[] { item.Country, item.Location }.Where(x => !string.IsNullOrWhiteSpace(x))))}");
            }

            var keyboard = new InlineKeyboardMarkup(
                InlineKeyboardButton.WithCallbackData(
                    "Открыть заказ",
                    TelegramBotCallback.OrderOpen(item.OrderId)));

            var delivered = 0;
            foreach (var chatId in recipients)
            {
                try
                {
                    await bot.SendMessage(chatId, sb.ToString(), ParseMode.Html, replyMarkup: keyboard, cancellationToken: cancellationToken);
                    delivered++;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to notify Telegram chat {ChatId} about status publish", chatId);
                }
            }

            if (delivered == 0)
            {
                throw new InvalidOperationException(
                    $"Telegram status notify delivered to 0 of {recipients.Count} recipients");
            }
        }
        catch
        {
            await ClearStatusHistoryNotifyClaimAsync(item.StatusHistoryId, cancellationToken);
            throw;
        }
    }

    public async Task SendProductImportCompletedAsync(
        int insertedCount,
        CancellationToken cancellationToken)
    {
        if (!_runtime.IsEnabled || _runtime.Client is null)
        {
            return;
        }

        var recipients = await GetRecipientTelegramIdsAsync(cancellationToken);
        if (recipients.Count == 0)
        {
            return;
        }

        var text = $"📦 Загружено новых товаров: <b>{insertedCount}</b>";

        var delivered = 0;
        foreach (var chatId in recipients)
        {
            try
            {
                await _runtime.Client.SendMessage(
                    chatId,
                    text,
                    ParseMode.Html,
                    cancellationToken: cancellationToken);
                delivered++;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to notify Telegram chat {ChatId} about product import", chatId);
            }
        }

        if (delivered == 0)
        {
            throw new InvalidOperationException(
                $"Telegram product import notify delivered to 0 of {recipients.Count} recipients");
        }
    }

    private async Task<IReadOnlyList<long>> GetRecipientTelegramIdsAsync(CancellationToken cancellationToken)
    {
        using var scope = _runtime.ScopeFactory.CreateScope();
        var admins = await scope.ServiceProvider
            .GetRequiredService<IAdminUserRepository>()
            .ListActiveWithTelegramAsync(cancellationToken);

        return admins
            .Select(a => a.TelegramId!.Value)
            .Distinct()
            .ToList();
    }

    private async Task<bool> HasSentOutboxAsync(string dedupKey, CancellationToken cancellationToken)
    {
        using var scope = _runtime.ScopeFactory.CreateScope();
        return await scope.ServiceProvider
            .GetRequiredService<ITelegramOutboxRepository>()
            .ExistsByDedupKeyAndStatusAsync(dedupKey, TelegramOutboxStatus.Sent, cancellationToken);
    }

    private async Task<bool> TryClaimStatusHistoryNotifyAsync(Guid statusHistoryId, CancellationToken cancellationToken)
    {
        using var scope = _runtime.ScopeFactory.CreateScope();
        return await scope.ServiceProvider
            .GetRequiredService<IOrderRepository>()
            .TryClaimTelegramNotifyAsync(statusHistoryId, DateTimeOffset.UtcNow, cancellationToken);
    }

    private async Task ClearStatusHistoryNotifyClaimAsync(Guid statusHistoryId, CancellationToken cancellationToken)
    {
        using var scope = _runtime.ScopeFactory.CreateScope();
        await scope.ServiceProvider
            .GetRequiredService<IOrderRepository>()
            .ClearTelegramNotifyClaimAsync(statusHistoryId, cancellationToken);
    }
}
