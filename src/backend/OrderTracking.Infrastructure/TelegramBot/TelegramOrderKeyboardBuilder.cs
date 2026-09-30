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
        _baseUrl = (configuration["App:AdminBaseUrl"]
            ?? configuration["App:BaseUrl"]
            ?? "http://localhost:8080").TrimEnd('/');
    }

    public InlineKeyboardMarkup BuildNotification(Guid orderId)
    {
        return new InlineKeyboardMarkup(
            InlineKeyboardButton.WithCallbackData(
                "Открыть заявку",
                TelegramBotCallback.OrderNotificationOpen(orderId)));
    }

    public InlineKeyboardMarkup BuildCard(Order order, int listPage, bool notificationContext)
    {
        var kind = TelegramOrderKindMapper.GetKind(order);
        var rows = new List<InlineKeyboardButton[]>();

        rows.Add([InlineKeyboardButton.WithCallbackData(
            "🛠 Управлять заявкой",
            TelegramBotCallback.OrderActions(order.Id, listPage))]);

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
            secondRow.Add(InlineKeyboardButton.WithUrl("🌐 Админка", GetAdminUrl(order.Id)));
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
            rows.Add([InlineKeyboardButton.WithCallbackData("← К заявкам", TelegramBotCallback.OrdersPagePrefix + Math.Max(1, listPage))]);
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

        rows.Add([InlineKeyboardButton.WithCallbackData("Статус: ожидает оплаты", TelegramBotCallback.OrderSetStatus(order.Id, listPage, OrderStatus.AwaitingPayment, notificationContext))]);
        rows.Add([InlineKeyboardButton.WithCallbackData("Статус: в работе", TelegramBotCallback.OrderSetStatus(order.Id, listPage, OrderStatus.InProgress, notificationContext))]);
        rows.Add([InlineKeyboardButton.WithCallbackData("Статус: завершён", TelegramBotCallback.OrderSetStatus(order.Id, listPage, OrderStatus.Completed, notificationContext))]);
        rows.Add([InlineKeyboardButton.WithCallbackData("Статус: отменён", TelegramBotCallback.OrderSetStatus(order.Id, listPage, OrderStatus.Cancelled, notificationContext))]);
        rows.Add([InlineKeyboardButton.WithUrl("Открыть в админке", adminUrl)]);
        rows.Add([InlineKeyboardButton.WithCallbackData("🗑 Удалить заявку", TelegramBotCallback.OrderDelete(order.Id, listPage))]);
        rows.Add([InlineKeyboardButton.WithCallbackData("← Назад", backCallback)]);

        return new InlineKeyboardMarkup(rows);
    }

    public InlineKeyboardMarkup BuildDeleteConfirmation(Guid orderId, int listPage)
    {
        return new InlineKeyboardMarkup(
        [
            [InlineKeyboardButton.WithCallbackData("Подтвердить удаление", TelegramBotCallback.OrderDelete(orderId, listPage, confirm: true))],
            [InlineKeyboardButton.WithCallbackData("← Назад", TelegramBotCallback.OrderActions(orderId, listPage))],
        ]);
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

    private static bool IsWebUrl(string? value)
    {
        return Uri.TryCreate(value, UriKind.Absolute, out var uri)
            && uri.Scheme is "http" or "https";
    }
}
