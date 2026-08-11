using Microsoft.Extensions.DependencyInjection;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Infrastructure.TelegramBot.Ui;
using Telegram.Bot.Types.ReplyMarkups;

namespace OrderTracking.Infrastructure.TelegramBot.Screens;

internal sealed class TelegramBotAdminsScreen
{
    private readonly TelegramBotRuntime _runtime;
    private readonly TelegramUiService _ui;

    public TelegramBotAdminsScreen(TelegramBotRuntime runtime, TelegramUiService ui)
    {
        _runtime = runtime;
        _ui = ui;
    }

    public async Task RenderPageAsync(
        long chatId,
        int? messageId,
        int page,
        CancellationToken cancellationToken)
    {
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
            new[] { InlineKeyboardButton.WithCallbackData("🏠 Главное меню", TelegramBotCallback.Main) },
        };

        var lines = items.Select((a, idx) =>
        {
            var tg = a.TelegramUsername is null ? "нет TG" : "@" + a.TelegramUsername;
            var active = a.IsActive ? "on" : "off";
            return $"{(page - 1) * TelegramBotKeyboards.PageSize + idx + 1}. <code>{TelegramBotText.Escape(a.Login)}</code> ({TelegramBotText.RoleLabel(a.Role)}, {active}, {TelegramBotText.Escape(tg)})";
        });

        var text =
            $"🛡 Админы (стр. {page}/{totalPages}, всего {total})\n\n" +
            (items.Count == 0 ? "Админов пока нет." : string.Join('\n', lines));

        await _ui.RenderAsync(chatId, messageId, text, new InlineKeyboardMarkup(buttons), cancellationToken);
    }
}
