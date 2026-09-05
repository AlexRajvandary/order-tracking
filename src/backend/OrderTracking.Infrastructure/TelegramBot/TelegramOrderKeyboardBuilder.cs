using Microsoft.Extensions.Configuration;
using OrderTracking.Domain.Entities;
using OrderTracking.Domain.Enums;
using Telegram.Bot.Types.ReplyMarkups;

namespace OrderTracking.Infrastructure.TelegramBot;

internal sealed class TelegramOrderKeyboardBuilder
{
    private readonly string _baseUrl;

    public TelegramOrderKeyboardBuilder(IConfiguration configuration)
    {
        _baseUrl = (configuration["App:BaseUrl"] ?? "http://localhost:8080").TrimEnd('/');
    }

    public InlineKeyboardMarkup BuildNotification(Guid orderId)
    {
        return new InlineKeyboardMarkup(
            InlineKeyboardButton.WithCallbackData(
                "Открыть заказ",
                TelegramBotCallback.OrderNotificationOpen(orderId)));
    }

    public InlineKeyboardMarkup BuildCard(Order order, int listPage, bool notificationContext)
    {
        var kind = TelegramOrderKindMapper.GetKind(order);
        var rows = new List<InlineKeyboardButton[]>();

        rows.Add([InlineKeyboardButton.WithUrl(GetPrimaryAction(order.Status, kind), GetAdminUrl(order.Id))]);

        var secondRow = new List<InlineKeyboardButton>
        {
            InlineKeyboardButton.WithCallbackData(
                "💬 Клиент",
                notificationContext
                    ? TelegramBotCallback.OrderNotificationContact(order.Id)
                    : TelegramBotCallback.OrderContact(order.Id, listPage)),
        };

        var sourceUrl = order.Items
            .OrderBy(item => item.SortOrder)
            .Select(item => item.SourceUrl)
            .FirstOrDefault(IsWebUrl);

        if (kind is TelegramOrderKind.Auction or TelegramOrderKind.Tickets && sourceUrl is not null)
        {
            secondRow.Add(InlineKeyboardButton.WithUrl(
                kind == TelegramOrderKind.Auction ? "🔗 Лот" : "🔗 Событие",
                sourceUrl));
        }
        else
        {
            secondRow.Add(InlineKeyboardButton.WithUrl("Открыть заказ", GetAdminUrl(order.Id)));
        }

        rows.Add(secondRow.ToArray());
        rows.Add([
            InlineKeyboardButton.WithCallbackData(
                "⋯ Действия",
                notificationContext
                    ? TelegramBotCallback.OrderNotificationActions(order.Id)
                    : TelegramBotCallback.OrderActions(order.Id, listPage)),
        ]);

        if (notificationContext)
        {
            rows.Add([InlineKeyboardButton.WithCallbackData("← Назад", TelegramBotCallback.OrderNotificationBack(order.Id))]);
        }
        else
        {
            rows.Add([InlineKeyboardButton.WithCallbackData("← К заказам", TelegramBotCallback.OrdersPagePrefix + Math.Max(1, listPage))]);
        }

        return new InlineKeyboardMarkup(rows);
    }

    public InlineKeyboardMarkup BuildActions(Order order, int listPage, bool notificationContext)
    {
        var historyCallback = notificationContext
            ? TelegramBotCallback.OrderNotificationHistory(order.Id)
            : TelegramBotCallback.OrderHistory(order.Id, listPage);
        var backCallback = notificationContext
            ? TelegramBotCallback.OrderNotificationOpen(order.Id)
            : TelegramBotCallback.OrderOpen(order.Id, listPage);
        var adminUrl = GetAdminUrl(order.Id);

        var rows = new List<InlineKeyboardButton[]>();
        if (order.Items.Any(item => item.StatusHistory.Count > 0))
        {
            rows.Add([InlineKeyboardButton.WithCallbackData("История", historyCallback)]);
        }

        rows.Add([
            InlineKeyboardButton.WithUrl("Изменить статус", adminUrl),
            InlineKeyboardButton.WithUrl("Отменить", adminUrl),
        ]);
        rows.Add([InlineKeyboardButton.WithUrl("Открыть в админке", adminUrl)]);
        rows.Add([InlineKeyboardButton.WithCallbackData("← Назад", backCallback)]);

        return new InlineKeyboardMarkup(rows);
    }

    public InlineKeyboardMarkup BuildSubviewBack(Guid orderId, int listPage, bool notificationContext)
    {
        return new InlineKeyboardMarkup(
            InlineKeyboardButton.WithCallbackData(
                "← Назад",
                notificationContext
                    ? TelegramBotCallback.OrderNotificationOpen(orderId)
                    : TelegramBotCallback.OrderOpen(orderId, listPage)));
    }

    private string GetAdminUrl(Guid orderId)
    {
        return $"{_baseUrl}/admin/orders/{orderId}";
    }

    private static string GetPrimaryAction(OrderStatus status, TelegramOrderKind kind)
    {
        if (status == OrderStatus.AwaitingPayment)
        {
            return kind switch
            {
                TelegramOrderKind.IndividualRequest => "Взять в работу",
                TelegramOrderKind.Auction => "🔨 Сделать ставку",
                TelegramOrderKind.Tickets => "🎫 Добавить вариант",
                _ => "💳 Оплата получена",
            };
        }

        return status switch
        {
            OrderStatus.InProgress => "Обновить заказ",
            OrderStatus.Completed => "Открыть завершённый заказ",
            OrderStatus.Cancelled => "Открыть отменённый заказ",
            _ => "Открыть заказ",
        };
    }

    private static bool IsWebUrl(string? value)
    {
        return Uri.TryCreate(value, UriKind.Absolute, out var uri)
            && uri.Scheme is "http" or "https";
    }
}
