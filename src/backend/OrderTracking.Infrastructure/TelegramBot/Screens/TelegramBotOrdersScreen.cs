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
    private readonly TelegramOrderKeyboardBuilder _keyboardBuilder;
    private readonly TelegramOrderMessageFormatter _messageFormatter;
    private readonly TelegramBotRuntime _runtime;
    private readonly TelegramUiService _ui;

    public TelegramBotOrdersScreen(
        TelegramBotRuntime runtime,
        TelegramUiService ui,
        TelegramOrderMessageFormatter messageFormatter,
        TelegramOrderKeyboardBuilder keyboardBuilder,
        ILogger<TelegramBotOrdersScreen> logger)
    {
        _runtime = runtime;
        _ui = ui;
        _messageFormatter = messageFormatter;
        _keyboardBuilder = keyboardBuilder;
        _logger = logger;
    }

    public async Task RenderPageAsync(
        long chatId,
        int? messageId,
        int page,
        CancellationToken cancellationToken)
    {
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
                    TelegramBotCallback.OrderOpen(o.Id, page)))
                .ToArray();
            buttons.Add(row);
        }

        buttons.Add(TelegramBotKeyboards.BuildPagerRow(TelegramBotCallback.OrdersPagePrefix, page, totalPages));
        buttons.Add([InlineKeyboardButton.WithCallbackData("🏠 Главное меню", TelegramBotCallback.Main)]);

        var lines = items.Select((o, idx) =>
            $"{(page - 1) * TelegramBotKeyboards.PageSize + idx + 1}. <code>{TelegramBotText.Escape(o.TrackingCode)}</code> — {TelegramBotText.Escape(o.CustomerName)}");

        var text =
            $"📦 Заказы (стр. {page}/{totalPages}, всего {total})\n\n" +
            (items.Count == 0 ? "Заказов пока нет." : string.Join('\n', lines));

        await _ui.RenderAsync(chatId, messageId, text, new InlineKeyboardMarkup(buttons), cancellationToken);
    }

    public Task RenderCardAsync(
        long chatId,
        int? messageId,
        Guid orderId,
        int listPage,
        CancellationToken cancellationToken)
    {
        return RenderCardCoreAsync(
            chatId,
            messageId,
            orderId,
            listPage,
            returnToNotification: false,
            hasAttachedPhoto: false,
            cancellationToken);
    }

    public Task RenderNotificationCardAsync(
        long chatId,
        int messageId,
        Guid orderId,
        bool hasAttachedPhoto,
        CancellationToken cancellationToken)
    {
        return RenderCardCoreAsync(
            chatId,
            messageId,
            orderId,
            listPage: 1,
            returnToNotification: true,
            hasAttachedPhoto,
            cancellationToken);
    }

    public async Task RenderOrderCreatedNotificationAsync(
        long chatId,
        int messageId,
        Guid orderId,
        bool hasAttachedPhoto,
        CancellationToken cancellationToken)
    {
        using var scope = _runtime.ScopeFactory.CreateScope();
        var order = await scope.ServiceProvider
            .GetRequiredService<IOrderRepository>()
            .GetByIdWithPublishedStatusHistoryAsync(orderId, cancellationToken);

        if (order is null)
        {
            await RenderNotificationMessageAsync(
                chatId,
                messageId,
                "Заказ не найден",
                new InlineKeyboardMarkup(
                    InlineKeyboardButton.WithCallbackData("🏠 Главное меню", TelegramBotCallback.Main)),
                hasAttachedPhoto,
                cancellationToken);
            return;
        }

        await RenderNotificationMessageAsync(
            chatId,
            messageId,
            _messageFormatter.Format(order),
            _keyboardBuilder.BuildNotification(order.Id),
            hasAttachedPhoto,
            cancellationToken);
    }

    public Task RenderActionsAsync(
        long chatId,
        int? messageId,
        Guid orderId,
        int listPage,
        bool notificationContext,
        bool hasAttachedPhoto,
        CancellationToken cancellationToken)
    {
        return RenderSubviewAsync(
            chatId,
            messageId,
            orderId,
            listPage,
            notificationContext,
            hasAttachedPhoto,
            order => $"<b>Действия · #{TelegramBotText.Escape(order.TrackingCode)}</b>",
            order => _keyboardBuilder.BuildActions(order, listPage, notificationContext),
            cancellationToken);
    }

    public Task RenderContactsAsync(
        long chatId,
        int? messageId,
        Guid orderId,
        int listPage,
        bool notificationContext,
        bool hasAttachedPhoto,
        CancellationToken cancellationToken)
    {
        return RenderSubviewAsync(
            chatId,
            messageId,
            orderId,
            listPage,
            notificationContext,
            hasAttachedPhoto,
            _messageFormatter.FormatContacts,
            order => _keyboardBuilder.BuildSubviewBack(order.Id, listPage, notificationContext),
            cancellationToken);
    }

    public Task RenderHistoryAsync(
        long chatId,
        int? messageId,
        Guid orderId,
        int listPage,
        bool notificationContext,
        bool hasAttachedPhoto,
        CancellationToken cancellationToken)
    {
        return RenderSubviewAsync(
            chatId,
            messageId,
            orderId,
            listPage,
            notificationContext,
            hasAttachedPhoto,
            _messageFormatter.FormatHistory,
            order => _keyboardBuilder.BuildSubviewBack(order.Id, listPage, notificationContext),
            cancellationToken);
    }

    private async Task RenderCardCoreAsync(
        long chatId,
        int? messageId,
        Guid orderId,
        int listPage,
        bool returnToNotification,
        bool hasAttachedPhoto,
        CancellationToken cancellationToken)
    {
        var bot = _runtime.RequireClient();
        using var scope = _runtime.ScopeFactory.CreateScope();
        var storage = scope.ServiceProvider.GetRequiredService<IObjectStorage>();
        var order = await scope.ServiceProvider
            .GetRequiredService<IOrderRepository>()
            .GetByIdWithPublishedStatusHistoryAsync(orderId, cancellationToken);

        if (order is null)
        {
            await _ui.RenderAsync(
                chatId,
                messageId,
                "Заказ не найден",
                new InlineKeyboardMarkup(
                    InlineKeyboardButton.WithCallbackData("🏠 Главное меню", TelegramBotCallback.Main)),
                cancellationToken);
            return;
        }

        var history = order.Items
            .SelectMany(i => i.StatusHistory)
            .OrderBy(h => h.ChangedAt)
            .ThenBy(h => h.Id)
            .ToList();

        var text = _messageFormatter.Format(order);
        var keyboard = _keyboardBuilder.BuildCard(order, listPage, returnToNotification);

        if (returnToNotification && messageId.HasValue)
        {
            await RenderNotificationMessageAsync(
                chatId,
                messageId.Value,
                text,
                keyboard,
                hasAttachedPhoto,
                cancellationToken);
        }
        else
        {
            await _ui.RenderAsync(chatId, messageId, text, keyboard, cancellationToken);
        }

        // Photos stay as separate event-like messages — cannot live inside edited text UI.
        foreach (var h in history)
        {
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
                    try
                    {
                        await bot.SendMessage(
                            chatId,
                            $"⚠ Не удалось отправить фото к статусу «{TelegramBotText.Escape(h.StatusText)}»",
                            ParseMode.Html,
                            cancellationToken: cancellationToken);
                    }
                    catch (Exception sendEx)
                    {
                        _logger.LogWarning(sendEx, "Failed to send photo error notice");
                    }
                }
            }
        }
    }

    private Task RenderNotificationMessageAsync(
        long chatId,
        int messageId,
        string text,
        InlineKeyboardMarkup replyMarkup,
        bool hasAttachedPhoto,
        CancellationToken cancellationToken)
    {
        return hasAttachedPhoto
            ? _ui.RenderCaptionAsync(chatId, messageId, text, replyMarkup, cancellationToken)
            : _ui.RenderAsync(chatId, messageId, text, replyMarkup, cancellationToken);
    }

    private async Task RenderSubviewAsync(
        long chatId,
        int? messageId,
        Guid orderId,
        int listPage,
        bool notificationContext,
        bool hasAttachedPhoto,
        Func<OrderTracking.Domain.Entities.Order, string> formatText,
        Func<OrderTracking.Domain.Entities.Order, InlineKeyboardMarkup> buildKeyboard,
        CancellationToken cancellationToken)
    {
        using var scope = _runtime.ScopeFactory.CreateScope();
        var order = await scope.ServiceProvider
            .GetRequiredService<IOrderRepository>()
            .GetByIdWithPublishedStatusHistoryAsync(orderId, cancellationToken);

        if (order is null)
        {
            await _ui.RenderAsync(
                chatId,
                messageId,
                "Заказ не найден",
                new InlineKeyboardMarkup(
                    InlineKeyboardButton.WithCallbackData("🏠 Главное меню", TelegramBotCallback.Main)),
                cancellationToken);
            return;
        }

        var text = formatText(order);
        var keyboard = buildKeyboard(order);
        if (notificationContext && messageId.HasValue)
        {
            await RenderNotificationMessageAsync(
                chatId,
                messageId.Value,
                text,
                keyboard,
                hasAttachedPhoto,
                cancellationToken);
            return;
        }

        await _ui.RenderAsync(chatId, messageId, text, keyboard, cancellationToken);
    }
}
