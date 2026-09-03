using System.Text;
using Telegram.Bot.Types.ReplyMarkups;

namespace OrderTracking.Infrastructure.TelegramBot;

internal static class TelegramOrderCreatedNotification
{
    public static string BuildText(
        Guid orderId,
        string trackingCode,
        string? customerName,
        string? phone,
        string? telegram,
        string? whatsApp,
        string? vk,
        string? address)
    {
        var text = new StringBuilder()
            .AppendLine("<b>Новый заказ</b>")
            .AppendLine($"Код: <code>{TelegramBotText.Escape(trackingCode)}</code>")
            .AppendLine($"Клиент: {TelegramBotText.Escape(customerName)}");

        AppendValue(text, "Телефон", phone);
        AppendValue(text, "Telegram", telegram);
        AppendValue(text, "WhatsApp", whatsApp);
        AppendValue(text, "VK", vk);
        AppendValue(text, "Адрес", address);
        text.Append($"Id: <code>{orderId}</code>");

        return text.ToString();
    }

    public static InlineKeyboardMarkup BuildKeyboard(Guid orderId)
    {
        return new InlineKeyboardMarkup(
            InlineKeyboardButton.WithCallbackData(
                "Смотреть заказ",
                TelegramBotCallback.OrderNotificationOpen(orderId)));
    }

    private static void AppendValue(StringBuilder text, string label, string? value)
    {
        if (!string.IsNullOrWhiteSpace(value))
        {
            text.AppendLine($"{label}: {TelegramBotText.Escape(value)}");
        }
    }
}
