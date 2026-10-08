using System.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using OrderTracking.Domain.Entities;
using OrderTracking.Domain.Enums;
using OrderTracking.Infrastructure.Persistence;
using Telegram.Bot;
using Telegram.Bot.Polling;
using Telegram.Bot.Types;
using Telegram.Bot.Types.Enums;
using Telegram.Bot.Types.ReplyMarkups;

namespace OrderTracking.Infrastructure.TelegramBot;

public sealed class CustomerTelegramBotHostedService : BackgroundService
{
    private const string OrdersPageCallbackPrefix = "customer-orders-page:";
    private const int PageSize = 10;

    private readonly CustomerTelegramBotRuntime _runtime;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<CustomerTelegramBotHostedService> _logger;

    public CustomerTelegramBotHostedService(
        CustomerTelegramBotRuntime runtime,
        IServiceScopeFactory scopeFactory,
        ILogger<CustomerTelegramBotHostedService> logger)
    {
        _runtime = runtime;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (_runtime.Client is not { } bot)
        {
            _logger.LogInformation("Customer Telegram bot is disabled (token not configured)");
            return;
        }

        await bot.SetMyCommands(
        [
            new BotCommand { Command = "info", Description = "Ссылки и контакты The Get" },
            new BotCommand { Command = "myorders", Description = "Мои заказы" },
        ],
        cancellationToken: stoppingToken);

        _logger.LogInformation("Customer Telegram bot started in long-polling mode");
        await bot.DeleteWebhook(cancellationToken: stoppingToken);
        await bot.ReceiveAsync(
            (_, update, token) => HandleUpdateAsync(bot, update, token),
            (_, exception, _) =>
            {
                _logger.LogError(exception, "Customer Telegram bot polling error");
                return Task.CompletedTask;
            },
            new ReceiverOptions
            {
                AllowedUpdates = [UpdateType.Message, UpdateType.CallbackQuery],
                DropPendingUpdates = false,
            },
            stoppingToken);
    }

    private async Task HandleUpdateAsync(ITelegramBotClient bot, Update update, CancellationToken cancellationToken)
    {
        try
        {
            if (update.Message is { Chat.Type: ChatType.Private, Text: { } text } message)
            {
                await HandleMessageAsync(bot, message, text, cancellationToken);
                return;
            }

            if (update.CallbackQuery is { } callback)
            {
                await HandleCallbackAsync(bot, callback, cancellationToken);
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Could not handle customer Telegram bot update {UpdateId}", update.Id);
        }
    }

    private async Task HandleMessageAsync(
        ITelegramBotClient bot,
        Message message,
        string text,
        CancellationToken cancellationToken)
    {
        var command = text.Trim().Split(' ', 2)[0].Split('@', 2)[0];
        if (string.Equals(command, "/info", StringComparison.OrdinalIgnoreCase))
        {
            await bot.SendMessage(
                message.Chat.Id,
                "🌐 <b>Сайт:</b> <a href=\"https://theget.ru\">https://theget.ru</a>\n" +
                "🛍 <b>Каталог товаров:</b> <a href=\"https://the-get.ru\">https://the-get.ru</a>\n" +
                "📢 <b>Telegram-канал:</b> <a href=\"https://t.me/thegetru\">https://t.me/thegetru</a>\n" +
                "🤖 <b>Telegram-бот:</b> @the_get_bot\n" +
                "💬 <b>Поддержка:</b> @getmvp",
                parseMode: ParseMode.Html,
                linkPreviewOptions: new LinkPreviewOptions { IsDisabled = true },
                cancellationToken: cancellationToken);
            return;
        }

        if (string.Equals(command, "/myorders", StringComparison.OrdinalIgnoreCase))
        {
            await RenderOrdersPageAsync(bot, message.Chat.Id, message.From!.Id, null, null, 1, cancellationToken);
        }
    }

    private async Task HandleCallbackAsync(
        ITelegramBotClient bot,
        CallbackQuery callback,
        CancellationToken cancellationToken)
    {
        if (callback.Data?.StartsWith(OrdersPageCallbackPrefix, StringComparison.Ordinal) == true &&
            callback.Message is { Chat.Type: ChatType.Private } message &&
            int.TryParse(callback.Data.AsSpan(OrdersPageCallbackPrefix.Length), out var page))
        {
            await RenderOrdersPageAsync(bot, message.Chat.Id, callback.From.Id, message.MessageId, callback.Id, page, cancellationToken);
            return;
        }

        await bot.AnswerCallbackQuery(callback.Id, cancellationToken: cancellationToken);
    }

    private async Task RenderOrdersPageAsync(
        ITelegramBotClient bot,
        long chatId,
        long telegramId,
        int? messageId,
        string? callbackQueryId,
        int requestedPage,
        CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var customerId = await db.AdminUsers.AsNoTracking()
            .Where(user => user.CustomerTelegramId == telegramId && user.IsActive && user.Role == AdminRole.Buyer)
            .Select(user => user.CustomerId)
            .FirstOrDefaultAsync(cancellationToken);

        string text;
        InlineKeyboardMarkup? keyboard = null;
        if (customerId is null)
        {
            text = "Чтобы посмотреть заказы, привяжите Telegram к личному кабинету на сайте The Get.";
        }
        else
        {
            var query = db.Orders.AsNoTracking().Where(order => order.CustomerId == customerId);
            var total = await query.CountAsync(cancellationToken);
            var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)PageSize));
            var page = Math.Clamp(requestedPage, 1, totalPages);
            var orders = await query
                .OrderByDescending(order => order.CreatedAt)
                .ThenByDescending(order => order.Id)
                .Skip((page - 1) * PageSize)
                .Take(PageSize)
                .Select(order => new CustomerOrderListItem(
                    order.TrackingCode,
                    order.Status,
                    order.CreatedAt,
                    order.Items.OrderBy(item => item.SortOrder).Select(item => item.Name).ToList()))
                .ToListAsync(cancellationToken);

            text = total == 0
                ? "📦 У вас пока нет заказов и заявок."
                : $"📦 <b>Мои заказы</b> (стр. {page}/{totalPages}, всего {total})\n\n" +
                    string.Join("\n\n", orders.Select((order, index) =>
                        $"{(page - 1) * PageSize + index + 1}. <b>№ {Escape(order.TrackingCode)}</b>\n" +
                        $"Статус: {StatusLabel(order.Status)} · {order.CreatedAt.ToLocalTime():dd.MM.yyyy}" +
                        (order.Items.Count == 0 ? string.Empty : "\n" + string.Join(", ", order.Items.Select(Escape)))));

            if (totalPages > 1)
            {
                var previous = page > 1
                    ? InlineKeyboardButton.WithCallbackData("‹", OrdersPageCallbackPrefix + (page - 1))
                    : InlineKeyboardButton.WithCallbackData("·", "customer-orders-noop");
                var current = InlineKeyboardButton.WithCallbackData($"стр. {page}/{totalPages}", "customer-orders-noop");
                var next = page < totalPages
                    ? InlineKeyboardButton.WithCallbackData("›", OrdersPageCallbackPrefix + (page + 1))
                    : InlineKeyboardButton.WithCallbackData("·", "customer-orders-noop");
                keyboard = new InlineKeyboardMarkup(new List<InlineKeyboardButton[]> { new[] { previous, current, next } });
            }
        }

        if (messageId is null)
        {
            await bot.SendMessage(chatId, text, parseMode: ParseMode.Html, replyMarkup: keyboard, cancellationToken: cancellationToken);
        }
        else
        {
            try
            {
                await bot.EditMessageText(chatId, messageId.Value, text, parseMode: ParseMode.Html,
                    replyMarkup: keyboard, cancellationToken: cancellationToken);
            }
            catch (Telegram.Bot.Exceptions.ApiRequestException exception) when (exception.Message.Contains("message is not modified", StringComparison.OrdinalIgnoreCase))
            {
                // Pressing the current page again should still acknowledge the callback.
            }
        }

        if (callbackQueryId is not null)
        {
            await bot.AnswerCallbackQuery(callbackQueryId, cancellationToken: cancellationToken);
        }
    }

    private static string StatusLabel(OrderStatus status) => status switch
    {
        OrderStatus.AwaitingPayment => "Ожидает оплаты",
        OrderStatus.InProgress => "В работе",
        OrderStatus.Completed => "Завершён",
        OrderStatus.Cancelled => "Отменён",
        _ => status.ToString(),
    };

    private static string Escape(string value) => WebUtility.HtmlEncode(value);

    private sealed record CustomerOrderListItem(string TrackingCode, OrderStatus Status, DateTimeOffset CreatedAt, List<string> Items);
}
