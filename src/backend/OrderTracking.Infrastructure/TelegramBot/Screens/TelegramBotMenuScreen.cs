using Microsoft.Extensions.Configuration;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Infrastructure.TelegramBot.Ui;
using Telegram.Bot.Types.ReplyMarkups;

namespace OrderTracking.Infrastructure.TelegramBot.Screens;

internal sealed class TelegramBotMenuScreen
{
    private readonly IConfiguration _configuration;
    private readonly TelegramBotRuntime _runtime;
    private readonly TelegramUiService _ui;

    public TelegramBotMenuScreen(
        TelegramBotRuntime runtime,
        IConfiguration configuration,
        TelegramUiService ui)
    {
        _runtime = runtime;
        _configuration = configuration;
        _ui = ui;
    }

    public Task RenderMainMenuAsync(
        long chatId,
        int? messageId,
        TelegramBotAdminContext admin,
        CancellationToken cancellationToken)
    {
        var name = string.IsNullOrWhiteSpace(admin.DisplayName) ? admin.Login : admin.DisplayName;
        var text =
            $"Здравствуйте, <b>{TelegramBotText.Escape(name)}</b>\n" +
            $"Роль: <code>{TelegramBotText.RoleLabel(admin.Role)}</code>\n\n" +
            "Выберите раздел (только просмотр):";

        return _ui.RenderAsync(
            chatId,
            messageId,
            text,
            TelegramBotKeyboards.MainMenu(admin),
            cancellationToken);
    }

    public Task RenderAdminLinkAsync(long chatId, int? messageId, CancellationToken cancellationToken)
    {
        var baseUrl = (_configuration["App:BaseUrl"] ?? "http://localhost:8080").TrimEnd('/');
        var url = $"{baseUrl}/admin/login";
        var text =
            "🔗 <b>Веб-админка</b>\n\n" +
            $"Ссылка для входа:\n<code>{TelegramBotText.Escape(url)}</code>";

        var keyboard = new InlineKeyboardMarkup(
        [
            [InlineKeyboardButton.WithUrl("Открыть админку", url)],
            [InlineKeyboardButton.WithCallbackData("🏠 Главное меню", TelegramBotCallback.Main)],
        ]);

        return _ui.RenderAsync(chatId, messageId, text, keyboard, cancellationToken);
    }
}
