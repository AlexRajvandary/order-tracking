using Microsoft.Extensions.DependencyInjection;
using Telegram.Bot;

namespace OrderTracking.Infrastructure.TelegramBot;

internal sealed class TelegramBotRuntime
{
    public TelegramBotRuntime(ITelegramBotClient? client, bool isEnabled, IServiceScopeFactory scopeFactory)
    {
        Client = client;
        IsEnabled = isEnabled;
        ScopeFactory = scopeFactory;
    }

    public ITelegramBotClient? Client { get; }

    public bool IsEnabled { get; }

    public IServiceScopeFactory ScopeFactory { get; }

    public ITelegramBotClient RequireClient() =>
        Client ?? throw new InvalidOperationException("Telegram bot client is not configured.");
}
