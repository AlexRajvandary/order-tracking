using Microsoft.Extensions.Configuration;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Infrastructure.TelegramBot.Ui;
using Telegram.Bot;
using Telegram.Bot.Types.Enums;

namespace OrderTracking.Infrastructure.TelegramBot.Screens;

internal sealed class TelegramBotMenuScreen
{
    private readonly IConfiguration _configuration;
    private readonly TelegramBotRuntime _runtime;

    public TelegramBotMenuScreen(TelegramBotRuntime runtime, IConfiguration configuration)
    {
        _runtime = runtime;
        _configuration = configuration;
    }

    public async Task SendMainMenuAsync(
        long chatId,
        TelegramBotAdminContext admin,
        CancellationToken cancellationToken)
    {
        var bot = _runtime.RequireClient();
        var name = string.IsNullOrWhiteSpace(admin.DisplayName) ? admin.Login : admin.DisplayName;
        var text =
            $"Здравствуйте, <b>{TelegramBotText.Escape(name)}</b>\n" +
            $"Роль: <code>{TelegramBotText.RoleLabel(admin.Role)}</code>\n\n" +
            "Выберите раздел (только просмотр):";

        await bot.SendMessage(
            chatId,
            text,
            ParseMode.Html,
            replyMarkup: TelegramBotKeyboards.MainMenu(admin),
            cancellationToken: cancellationToken);
    }

    public async Task SendAdminLinkAsync(long chatId, CancellationToken cancellationToken)
    {
        var bot = _runtime.RequireClient();
        var baseUrl = (_configuration["App:BaseUrl"] ?? "http://localhost:8080").TrimEnd('/');
        var url = $"{baseUrl}/admin/login";
        await bot.SendMessage(
            chatId,
            $"Ссылка для входа в админку (можно скопировать):\n\n<code>{TelegramBotText.Escape(url)}</code>",
            ParseMode.Html,
            cancellationToken: cancellationToken);
    }
}
