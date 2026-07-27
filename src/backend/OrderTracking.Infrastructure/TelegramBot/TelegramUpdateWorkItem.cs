using Telegram.Bot.Types;

namespace OrderTracking.Infrastructure.TelegramBot;

internal sealed record TelegramUpdateWorkItem(Update Update) : TelegramWorkItem;
