using Microsoft.Extensions.DependencyInjection;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Infrastructure.TelegramBot.Ui;
using Telegram.Bot;
using Telegram.Bot.Types.Enums;
using Telegram.Bot.Types.ReplyMarkups;

namespace OrderTracking.Infrastructure.TelegramBot.Screens;

internal sealed class TelegramBotAdminsScreen
{
    private readonly TelegramBotRuntime _runtime;

    public TelegramBotAdminsScreen(TelegramBotRuntime runtime)
    {
        _runtime = runtime;
    }

    public async Task SendPageAsync(long chatId, int page, CancellationToken cancellationToken)
    {
        var bot = _runtime.RequireClient();
        using var scope = _runtime.ScopeFactory.CreateScope();
        var admins = await scope.ServiceProvider
            .GetRequiredService<IAdminUserRepository>()
            .ListOrderedByLoginAsync(cancellationToken);

        page = Math.Max(1, page);
        var total = admins.Count;
        var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)TelegramBotKeyboards.PageSize));
        page = Math.Min(page, totalPages);

        var items = admins
            .Skip((page - 1) * TelegramBotKeyboards.PageSize)
            .Take(TelegramBotKeyboards.PageSize)
            .ToList();

        var buttons = new List<InlineKeyboardButton[]>
        {
            TelegramBotKeyboards.BuildPagerRow(TelegramBotCallback.AdminsPagePrefix, page, totalPages),
            new[] { InlineKeyboardButton.WithCallbackData("« В меню", TelegramBotCallback.Main) },
        };

        var lines = items.Select((a, idx) =>
        {
            var tg = a.TelegramUsername is null ? "нет TG" : "@" + a.TelegramUsername;
            var active = a.IsActive ? "on" : "off";
            return $"{(page - 1) * TelegramBotKeyboards.PageSize + idx + 1}. <code>{TelegramBotText.Escape(a.Login)}</code> ({TelegramBotText.RoleLabel(a.Role)}, {active}, {TelegramBotText.Escape(tg)})";
        });

        await bot.SendMessage(
            chatId,
            $"🛡 Админы (стр. {page}/{totalPages}, всего {total})\n\n{string.Join('\n', lines)}",
            ParseMode.Html,
            replyMarkup: new InlineKeyboardMarkup(buttons),
            cancellationToken: cancellationToken);
    }
}
