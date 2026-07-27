using Microsoft.Extensions.DependencyInjection;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Infrastructure.TelegramBot.Ui;
using Telegram.Bot;
using Telegram.Bot.Types.Enums;
using Telegram.Bot.Types.ReplyMarkups;

namespace OrderTracking.Infrastructure.TelegramBot.Screens;

internal sealed class TelegramBotCustomersScreen
{
    private readonly TelegramBotRuntime _runtime;

    public TelegramBotCustomersScreen(TelegramBotRuntime runtime)
    {
        _runtime = runtime;
    }

    public async Task SendPageAsync(long chatId, int page, CancellationToken cancellationToken)
    {
        var bot = _runtime.RequireClient();
        using var scope = _runtime.ScopeFactory.CreateScope();
        var customers = scope.ServiceProvider.GetRequiredService<ICustomerRepository>();

        page = Math.Max(1, page);
        var customersPage = await customers.GetPagedAsync(page, TelegramBotKeyboards.PageSize, cancellationToken);
        var total = customersPage.TotalCount;
        var totalPages = Math.Max(1, customersPage.TotalPages);
        page = Math.Min(page, totalPages);
        if (page != customersPage.Page)
        {
            customersPage = await customers.GetPagedAsync(page, TelegramBotKeyboards.PageSize, cancellationToken);
        }

        var items = customersPage.Items
            .Select(c => new { c.Id, Name = ((c.LastName ?? "") + " " + (c.FirstName ?? "")).Trim(), c.Phone })
            .ToList();

        var buttons = new List<InlineKeyboardButton[]>();
        for (var i = 0; i < items.Count; i += 5)
        {
            var row = items.Skip(i).Take(5)
                .Select(c => InlineKeyboardButton.WithCallbackData(
                    TelegramBotText.Truncate(string.IsNullOrWhiteSpace(c.Name) ? c.Id.ToString("N")[..8] : c.Name, 14),
                    TelegramBotCallback.CustomerOpenPrefix + TelegramBotCallback.EncodeGuid(c.Id)))
                .ToArray();
            buttons.Add(row);
        }

        buttons.Add(TelegramBotKeyboards.BuildPagerRow(TelegramBotCallback.CustomersPagePrefix, page, totalPages));
        buttons.Add([InlineKeyboardButton.WithCallbackData("« В меню", TelegramBotCallback.Main)]);

        var lines = items.Select((c, idx) =>
            $"{(page - 1) * TelegramBotKeyboards.PageSize + idx + 1}. {TelegramBotText.Escape(c.Name)} — {TelegramBotText.Escape(c.Phone)}");

        await bot.SendMessage(
            chatId,
            $"👤 Клиенты (стр. {page}/{totalPages}, всего {total})\n\n{string.Join('\n', lines)}",
            ParseMode.Html,
            replyMarkup: new InlineKeyboardMarkup(buttons),
            cancellationToken: cancellationToken);
    }

    public async Task SendCardAsync(long chatId, Guid customerId, CancellationToken cancellationToken)
    {
        var bot = _runtime.RequireClient();
        using var scope = _runtime.ScopeFactory.CreateScope();
        var customers = scope.ServiceProvider.GetRequiredService<ICustomerRepository>();
        var c = await customers.GetByIdUntrackedAsync(customerId, cancellationToken);
        if (c is null)
        {
            await bot.SendMessage(chatId, "Клиент не найден", cancellationToken: cancellationToken);
            return;
        }

        var name = $"{c.LastName} {c.FirstName} {c.Patronymic}".Trim();
        var text =
            $"👤 <b>{TelegramBotText.Escape(name)}</b>\n" +
            $"Телефон: {TelegramBotText.Escape(c.Phone)}\n" +
            $"Email: {TelegramBotText.Escape(c.Email)}\n" +
            $"Telegram: {TelegramBotText.Escape(c.Telegram)}\n" +
            $"Заказов: {c.OrdersCount}\n" +
            $"Создан: {c.CreatedAt:yyyy-MM-dd HH:mm} UTC";

        await bot.SendMessage(
            chatId,
            text,
            ParseMode.Html,
            replyMarkup: new InlineKeyboardMarkup(
                InlineKeyboardButton.WithCallbackData("« К клиентам", TelegramBotCallback.CustomersPagePrefix + "1"),
                InlineKeyboardButton.WithCallbackData("« В меню", TelegramBotCallback.Main)),
            cancellationToken: cancellationToken);
    }
}
