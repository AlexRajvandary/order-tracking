using OrderTracking.Application.Common.Interfaces;
using Telegram.Bot.Types.ReplyMarkups;

namespace OrderTracking.Infrastructure.TelegramBot.Ui;

internal static class TelegramBotKeyboards
{
    public const int PageSize = 10;

    public static InlineKeyboardButton[] BuildPagerRow(string prefix, int page, int totalPages)
    {
        var prev = page > 1
            ? InlineKeyboardButton.WithCallbackData("‹", prefix + (page - 1))
            : InlineKeyboardButton.WithCallbackData("·", TelegramBotCallback.Noop);
        var next = page < totalPages
            ? InlineKeyboardButton.WithCallbackData("›", prefix + (page + 1))
            : InlineKeyboardButton.WithCallbackData("·", TelegramBotCallback.Noop);
        var current = InlineKeyboardButton.WithCallbackData($"стр. {page}/{totalPages}", TelegramBotCallback.Noop);
        return [prev, current, next];
    }

    public static InlineKeyboardMarkup MainMenu(TelegramBotAdminContext admin)
    {
        var rows = new List<InlineKeyboardButton[]>
        {
            new[] { InlineKeyboardButton.WithCallbackData("📦 Заказы", TelegramBotCallback.OrdersPagePrefix + "1") },
            new[] { InlineKeyboardButton.WithCallbackData("👤 Клиенты", TelegramBotCallback.CustomersPagePrefix + "1") },
        };

        if (admin.Role is Domain.Enums.AdminRole.Admin or Domain.Enums.AdminRole.SuperAdmin)
        {
            rows.Add([InlineKeyboardButton.WithCallbackData("🛡 Админы", TelegramBotCallback.AdminsPagePrefix + "1")]);
        }

        rows.Add([InlineKeyboardButton.WithCallbackData("🔗 Актуальная ссылка в админку", TelegramBotCallback.AdminLink)]);
        rows.Add([InlineKeyboardButton.WithCallbackData("⚙️ Настройки CSV", TelegramBotCallback.Settings)]);

        return new InlineKeyboardMarkup(rows);
    }
}
