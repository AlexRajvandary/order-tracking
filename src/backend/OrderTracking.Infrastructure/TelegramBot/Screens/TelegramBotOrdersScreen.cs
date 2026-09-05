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
    private readonly TelegramUiService _ui;

    public TelegramBotOrdersScreen(
        TelegramBotRuntime runtime,
        TelegramUiService ui,
        ILogger<TelegramBotOrdersScreen> logger)
    {
        _runtime = runtime;
        _ui = ui;
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

        var customerName = order.Customer is null
            ? null
            : $"{order.Customer.LastName} {order.Customer.FirstName} {order.Customer.Patronymic}".Trim();
        var address = string.Join(
            ", ",
            new[]
            {
                order.DeliveryPostalCode,
                order.DeliveryCity,
                order.DeliveryStreet,
                order.DeliveryBuilding,
                order.DeliveryApartment,
                order.DeliveryNote,
            }.Where(value => !string.IsNullOrWhiteSpace(value)));

        var text = TelegramOrderCreatedNotification.BuildText(
            order.Id,
            order.TrackingCode,
            customerName,
            order.Customer?.Phone,
            order.Customer?.Telegram,
            order.Customer?.WhatsApp,
            order.Customer?.Vk,
            address);

        await RenderNotificationMessageAsync(
            chatId,
            messageId,
            text,
            TelegramOrderCreatedNotification.BuildKeyboard(order.Id),
            hasAttachedPhoto,
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

        var customerName = order.Customer is null
            ? null
            : $"{order.Customer.LastName} {order.Customer.FirstName} {order.Customer.Patronymic}".Trim();

        var history = order.Items
            .SelectMany(i => i.StatusHistory)
            .OrderBy(h => h.ChangedAt)
            .ThenBy(h => h.Id)
            .ToList();

        var sb = new System.Text.StringBuilder();
        sb.AppendLine($"📦 Заказ <code>{TelegramBotText.Escape(order.TrackingCode)}</code>");
        sb.AppendLine($"Статус: <b>{TelegramBotText.Escape(order.Status.ToString())}</b>");
        sb.AppendLine($"Клиент: {DisplayValue(customerName)}");
        sb.AppendLine($"Телефон: {DisplayValue(order.Customer?.Phone)}");
        sb.AppendLine($"Telegram: {DisplayValue(order.Customer?.Telegram)}");
        sb.AppendLine($"WhatsApp: {DisplayValue(order.Customer?.WhatsApp)}");
        sb.AppendLine($"VK: {DisplayValue(order.Customer?.Vk)}");

        sb.AppendLine($"Создан: {order.CreatedAt:yyyy-MM-dd HH:mm} UTC");

        var isServiceRequest = order.AdminNotes?.StartsWith(
            "Заявка из формы:",
            StringComparison.Ordinal) == true;

        if (isServiceRequest && order.Items.Count > 0)
        {
            sb.AppendLine();
            sb.AppendLine("<b>Запрос:</b>");
            foreach (var item in order.Items.OrderBy(i => i.SortOrder).ThenBy(i => i.CreatedAt))
            {
                if (!IsGenericServiceRequestName(item.Name))
                {
                    sb.AppendLine(TelegramBotText.Escape(item.Name));
                }

                sb.AppendLine(DisplayValue(item.Description ?? item.Name));

                if (!string.IsNullOrWhiteSpace(item.SourceUrl))
                {
                    sb.AppendLine($"Ссылка: {TelegramBotText.Escape(item.SourceUrl)}");
                }

                if (item.UnitPrice.HasValue)
                {
                    sb.AppendLine(
                        $"Бюджет: {item.UnitPrice.Value:0.##} {TelegramBotText.Escape(item.CurrencyCode)}");
                }

                if (item.Quantity > 1)
                {
                    sb.AppendLine($"Количество: {item.Quantity}");
                }
            }
        }
        else
        {
            sb.AppendLine($"Позиций: {order.Items.Count}");

            if (order.Items.Count > 0)
            {
                sb.AppendLine();
                sb.AppendLine("<b>Позиции:</b>");
                foreach (var item in order.Items.OrderBy(i => i.SortOrder).ThenBy(i => i.CreatedAt))
                {
                    sb.AppendLine($"• {TelegramBotText.Escape(item.Name)} × {item.Quantity}");
                    if (!string.IsNullOrWhiteSpace(item.SourceUrl))
                    {
                        sb.AppendLine($"  Источник: {TelegramBotText.Escape(item.SourceUrl)}");
                    }
                }
            }
        }

        sb.AppendLine();
        if (history.Count == 0)
        {
            sb.AppendLine("Опубликованных статусов пока нет.");
        }
        else
        {
            sb.AppendLine("<b>Опубликованные статусы:</b>");
            foreach (var h in history)
            {
                sb.AppendLine();
                sb.AppendLine($"📍 <b>{TelegramBotText.Escape(h.StatusText)}</b>");
                sb.AppendLine($"Позиция: {TelegramBotText.Escape(h.OrderItem.Name)}");
                sb.AppendLine($"Когда: {h.ChangedAt:yyyy-MM-dd HH:mm} UTC");
                if (!string.IsNullOrWhiteSpace(h.Country) || !string.IsNullOrWhiteSpace(h.Location))
                {
                    sb.AppendLine(
                        $"Где: {TelegramBotText.Escape(string.Join(", ", new[] { h.Country, h.Location }.Where(x => !string.IsNullOrWhiteSpace(x))))}");
                }

                if (!string.IsNullOrWhiteSpace(h.Comment))
                {
                    sb.AppendLine($"Комментарий: {TelegramBotText.Escape(h.Comment)}");
                }

                var photoCount = h.Attachments.Count(a =>
                    a.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase));
                if (photoCount > 0)
                {
                    sb.AppendLine($"Фото: {photoCount} (ниже отдельными сообщениями)");
                }
            }
        }

        var keyboard = returnToNotification
            ? new InlineKeyboardMarkup(
                InlineKeyboardButton.WithCallbackData(
                    "← Назад",
                    TelegramBotCallback.OrderNotificationBack(orderId)))
            : new InlineKeyboardMarkup(
            [
                [InlineKeyboardButton.WithCallbackData("← К заказам", TelegramBotCallback.OrdersPagePrefix + Math.Max(1, listPage))],
                [InlineKeyboardButton.WithCallbackData("🏠 Главное меню", TelegramBotCallback.Main)],
            ]);

        if (returnToNotification && messageId.HasValue)
        {
            await RenderNotificationMessageAsync(
                chatId,
                messageId.Value,
                sb.ToString(),
                keyboard,
                hasAttachedPhoto,
                cancellationToken);
        }
        else
        {
            await _ui.RenderAsync(chatId, messageId, sb.ToString(), keyboard, cancellationToken);
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

    private static string DisplayValue(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? "пусто"
            : TelegramBotText.Escape(value);
    }

    private static bool IsGenericServiceRequestName(string name)
    {
        return name is "Индивидуальный запрос" or "Аукционный лот";
    }
}
