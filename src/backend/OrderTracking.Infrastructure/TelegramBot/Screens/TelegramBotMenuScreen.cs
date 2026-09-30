using Microsoft.Extensions.Configuration;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Infrastructure.TelegramBot.Ui;
using Telegram.Bot.Types.ReplyMarkups;
using Telegram.Bot.Types;

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
        var baseUrl = (_configuration["App:AdminBaseUrl"]
            ?? _configuration["App:BaseUrl"]
            ?? "http://localhost:8080").TrimEnd('/');
        var url = $"{baseUrl}/admin/login";
        var miniAppUrl = $"{baseUrl}/admin";
        var text =
            "🔗 <b>Админка и мини-приложение</b>\n\n" +
            "В Mini App вход выполнится автоматически, если Telegram привязан к активному аккаунту администратора.\n\n" +
            $"Ссылка для браузера:\n<code>{TelegramBotText.Escape(url)}</code>";

        var rows = new List<InlineKeyboardButton[]>();
        if (Uri.TryCreate(miniAppUrl, UriKind.Absolute, out var miniAppUri)
            && miniAppUri.Scheme == Uri.UriSchemeHttps)
        {
            rows.Add([InlineKeyboardButton.WithWebApp("Открыть Mini App", new WebAppInfo(miniAppUrl))]);
        }

        rows.Add([InlineKeyboardButton.WithUrl("Открыть админку", url)]);
        rows.Add([InlineKeyboardButton.WithCallbackData("🏠 Главное меню", TelegramBotCallback.Main)]);
        var keyboard = new InlineKeyboardMarkup(rows);

        return _ui.RenderAsync(chatId, messageId, text, keyboard, cancellationToken);
    }
}
