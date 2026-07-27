using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Infrastructure.TelegramBot.Ui;
using Telegram.Bot;
using Telegram.Bot.Types;
using Telegram.Bot.Types.Enums;
using Telegram.Bot.Types.ReplyMarkups;

namespace OrderTracking.Infrastructure.TelegramBot.Screens;

internal sealed class TelegramBotOrdersScreen
{
    private readonly ILogger<TelegramBotOrdersScreen> _logger;
    private readonly TelegramBotRuntime _runtime;

    public TelegramBotOrdersScreen(TelegramBotRuntime runtime, ILogger<TelegramBotOrdersScreen> logger)
    {
        _runtime = runtime;
        _logger = logger;
    }

    public async Task SendPageAsync(long chatId, int page, CancellationToken cancellationToken)
    {
        var bot = _runtime.RequireClient();
        using var scope = _runtime.ScopeFactory.CreateScope();
        var orders = scope.ServiceProvider.GetRequiredService<IOrderRepository>();

        page = Math.Max(1, page);
        var ordersPage = await orders.GetPagedAsync(page, TelegramBotKeyboards.PageSize, cancellationToken);
        var total = ordersPage.TotalCount;
        var totalPages = Math.Max(1, ordersPage.TotalPages);
        page = Math.Min(page, totalPages);
        if (page != ordersPage.Page)
        {
            ordersPage = await orders.GetPagedAsync(page, TelegramBotKeyboards.PageSize, cancellationToken);
        }

        var items = ordersPage.Items;

        var buttons = new List<InlineKeyboardButton[]>();
        for (var i = 0; i < items.Count; i += 5)
        {
            var row = items.Skip(i).Take(5)
                .Select(o => InlineKeyboardButton.WithCallbackData(
                    TelegramBotText.Truncate(o.TrackingCode, 12),
                    TelegramBotCallback.OrderOpenPrefix + TelegramBotCallback.EncodeGuid(o.Id)))
                .ToArray();
            buttons.Add(row);
        }

        buttons.Add(TelegramBotKeyboards.BuildPagerRow(TelegramBotCallback.OrdersPagePrefix, page, totalPages));
        buttons.Add([InlineKeyboardButton.WithCallbackData("« В меню", TelegramBotCallback.Main)]);

        var lines = items.Select((o, idx) =>
            $"{(page - 1) * TelegramBotKeyboards.PageSize + idx + 1}. <code>{TelegramBotText.Escape(o.TrackingCode)}</code> — {TelegramBotText.Escape(o.CustomerName)}");

        await bot.SendMessage(
            chatId,
            $"📦 Заказы (стр. {page}/{totalPages}, всего {total})\n\n{string.Join('\n', lines)}",
            ParseMode.Html,
            replyMarkup: new InlineKeyboardMarkup(buttons),
            cancellationToken: cancellationToken);
    }

    public async Task SendCardAsync(long chatId, Guid orderId, CancellationToken cancellationToken)
    {
        var bot = _runtime.RequireClient();
        using var scope = _runtime.ScopeFactory.CreateScope();
        var storage = scope.ServiceProvider.GetRequiredService<IObjectStorage>();
        var order = await scope.ServiceProvider
            .GetRequiredService<IOrderRepository>()
            .GetByIdWithPublishedStatusHistoryAsync(orderId, cancellationToken);

        if (order is null)
        {
            await bot.SendMessage(chatId, "Заказ не найден", cancellationToken: cancellationToken);
            return;
        }

        var customerName = order.Customer is null
            ? null
            : $"{order.Customer.LastName} {order.Customer.FirstName} {order.Customer.Patronymic}".Trim();

        var header =
            $"📦 Заказ <code>{TelegramBotText.Escape(order.TrackingCode)}</code>\n" +
            $"Статус: <b>{TelegramBotText.Escape(order.Status.ToString())}</b>\n" +
            $"Клиент: {TelegramBotText.Escape(customerName)}\n" +
            $"Тел: {TelegramBotText.Escape(order.Customer?.Phone)}\n" +
            $"TG: {TelegramBotText.Escape(order.Customer?.Telegram)}\n" +
            $"Создан: {order.CreatedAt:yyyy-MM-dd HH:mm} UTC\n" +
            $"Позиций: {order.Items.Count}";

        await bot.SendMessage(
            chatId,
            header,
            ParseMode.Html,
            replyMarkup: new InlineKeyboardMarkup(
                InlineKeyboardButton.WithCallbackData("« К заказам", TelegramBotCallback.OrdersPagePrefix + "1"),
                InlineKeyboardButton.WithCallbackData("« В меню", TelegramBotCallback.Main)),
            cancellationToken: cancellationToken);

        var history = order.Items
            .SelectMany(i => i.StatusHistory)
            .OrderBy(h => h.ChangedAt)
            .ThenBy(h => h.Id)
            .ToList();

        if (history.Count == 0)
        {
            await bot.SendMessage(chatId, "Опубликованных статусов пока нет.", cancellationToken: cancellationToken);
            return;
        }

        foreach (var h in history)
        {
            var sb = new System.Text.StringBuilder();
            sb.AppendLine($"📍 <b>{TelegramBotText.Escape(h.StatusText)}</b>");
            sb.AppendLine($"Позиция: {TelegramBotText.Escape(h.OrderItem.Name)}");
            sb.AppendLine($"Когда: {h.ChangedAt:yyyy-MM-dd HH:mm} UTC");
            if (!string.IsNullOrWhiteSpace(h.Country) || !string.IsNullOrWhiteSpace(h.Location))
            {
                sb.AppendLine($"Где: {TelegramBotText.Escape(string.Join(", ", new[] { h.Country, h.Location }.Where(x => !string.IsNullOrWhiteSpace(x))))}");
            }

            if (!string.IsNullOrWhiteSpace(h.Comment))
            {
                sb.AppendLine($"Комментарий: {TelegramBotText.Escape(h.Comment)}");
            }

            await bot.SendMessage(chatId, sb.ToString(), ParseMode.Html, cancellationToken: cancellationToken);

            var photos = h.Attachments
                .Where(a => a.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
                .OrderBy(a => a.SortOrder)
                .ToList();

            foreach (var batch in photos.Chunk(10))
            {
                try
                {
                    if (batch.Length == 1)
                    {
                        var a = batch[0];
                        await using var stream = await storage.GetAsync(a.ObjectKey, cancellationToken);
                        await using var ms = new MemoryStream();
                        await stream.CopyToAsync(ms, cancellationToken);
                        ms.Position = 0;
                        await bot.SendPhoto(
                            chatId,
                            InputFile.FromStream(ms, a.OriginalFileName ?? "photo.jpg"),
                            caption: $"Фото к статусу «{h.StatusText}»",
                            cancellationToken: cancellationToken);
                        continue;
                    }

                    var album = new List<IAlbumInputMedia>();
                    var streams = new List<MemoryStream>();
                    try
                    {
                        var index = 0;
                        foreach (var a in batch)
                        {
                            await using var stream = await storage.GetAsync(a.ObjectKey, cancellationToken);
                            var ms = new MemoryStream();
                            await stream.CopyToAsync(ms, cancellationToken);
                            ms.Position = 0;
                            streams.Add(ms);
                            var media = new InputMediaPhoto(InputFile.FromStream(ms, a.OriginalFileName ?? $"photo-{index}.jpg"));
                            if (index == 0)
                            {
                                media.Caption = $"Фото к статусу «{h.StatusText}»";
                            }

                            album.Add(media);
                            index++;
                        }

                        await bot.SendMediaGroup(chatId, album, cancellationToken: cancellationToken);
                    }
                    finally
                    {
                        foreach (var s in streams)
                        {
                            await s.DisposeAsync();
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to send status photos for history {HistoryId}", h.Id);
                    await bot.SendMessage(
                        chatId,
                        $"⚠ Не удалось отправить фото к статусу «{TelegramBotText.Escape(h.StatusText)}»",
                        ParseMode.Html,
                        cancellationToken: cancellationToken);
                }
            }
        }
    }
}
