using Microsoft.Extensions.Configuration;
using Telegram.Bot;

namespace OrderTracking.Infrastructure.TelegramBot;

public sealed class CustomerTelegramBotRuntime
{
    public CustomerTelegramBotRuntime(IConfiguration configuration)
    {
        var token = configuration["CUSTOMER_TELEGRAM_BOT_TOKEN"]
            ?? configuration["CustomerTelegram:BotToken"];
        Client = string.IsNullOrWhiteSpace(token) ? null : new TelegramBotClient(token);
    }

    public ITelegramBotClient? Client { get; }
}
