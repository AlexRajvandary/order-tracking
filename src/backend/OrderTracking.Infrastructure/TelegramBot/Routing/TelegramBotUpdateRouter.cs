using Microsoft.Extensions.Logging;
using OrderTracking.Domain.Enums;
using OrderTracking.Infrastructure.TelegramBot.Auth;
using OrderTracking.Infrastructure.TelegramBot.Screens;
using Telegram.Bot;
using Telegram.Bot.Types;

namespace OrderTracking.Infrastructure.TelegramBot.Routing;

internal sealed class TelegramBotUpdateRouter
{
    private readonly TelegramBotAdminsScreen _admins;
    private readonly TelegramBotAdminResolver _adminResolver;
    private readonly TelegramBotCustomersScreen _customers;
    private readonly ILogger<TelegramBotUpdateRouter> _logger;
    private readonly TelegramBotMenuScreen _menu;
    private readonly TelegramBotOrdersScreen _orders;
    private readonly TelegramBotRuntime _runtime;
    private readonly TelegramBotSettingsScreen _settings;

    public TelegramBotUpdateRouter(
        TelegramBotRuntime runtime,
        TelegramBotAdminResolver adminResolver,
        TelegramBotMenuScreen menu,
        TelegramBotOrdersScreen orders,
        TelegramBotCustomersScreen customers,
        TelegramBotAdminsScreen admins,
        TelegramBotSettingsScreen settings,
        ILogger<TelegramBotUpdateRouter> logger)
    {
        _runtime = runtime;
        _adminResolver = adminResolver;
        _menu = menu;
        _orders = orders;
        _customers = customers;
        _admins = admins;
        _settings = settings;
        _logger = logger;
    }

    public async Task HandleUpdateAsync(Update update, CancellationToken cancellationToken)
    {
        if (!_runtime.IsEnabled || _runtime.Client is null)
        {
            return;
        }

        try
        {
            if (update.CallbackQuery is { } callback)
            {
                await HandleCallbackAsync(callback, cancellationToken);
                return;
            }

            if (update.Message is { Text: not null } message)
            {
                await HandleMessageAsync(message, cancellationToken);
                return;
            }

            _logger.LogWarning(
                "Ignored Telegram update {UpdateId} of type {UpdateType}",
                update.Id,
                update.Type);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to handle Telegram update {UpdateId}", update.Id);
        }
    }

    private async Task HandleMessageAsync(Message message, CancellationToken cancellationToken)
    {
        var bot = _runtime.RequireClient();
        var admin = await _adminResolver.ResolveAsync(message.From?.Id, cancellationToken);
        if (admin is null)
        {
            await bot.SendMessage(
                message.Chat.Id,
                "Доступ запрещён. Привяжите Telegram-аккаунт к активному админу в веб-админке.",
                cancellationToken: cancellationToken);
            return;
        }

        await _menu.SendMainMenuAsync(message.Chat.Id, admin, cancellationToken);
    }

    private async Task HandleCallbackAsync(CallbackQuery callback, CancellationToken cancellationToken)
    {
        var bot = _runtime.RequireClient();

        // Private chats: From.Id == chat id. Prefer Message.Chat when present.
        var chatId = callback.Message?.Chat?.Id ?? callback.From?.Id;
        if (chatId is null || callback.From is null)
        {
            _logger.LogWarning(
                "Ignoring callback {CallbackId}: missing chat/from (hasMessage={HasMessage})",
                callback.Id,
                callback.Message is not null);
            try
            {
                await bot.AnswerCallbackQuery(callback.Id, cancellationToken: cancellationToken);
            }
            catch
            {
                // ignore
            }

            return;
        }

        // Answer immediately so Telegram stops the loading spinner even if DB/UI is slow.
        try
        {
            await bot.AnswerCallbackQuery(callback.Id, cancellationToken: cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to answer callback {CallbackId}", callback.Id);
        }

        var admin = await _adminResolver.ResolveAsync(callback.From.Id, cancellationToken);
        if (admin is null)
        {
            await bot.SendMessage(
                chatId.Value,
                "Доступ запрещён. Привяжите Telegram в админке.",
                cancellationToken: cancellationToken);
            return;
        }

        var data = callback.Data ?? string.Empty;

        try
        {
            if (data is TelegramBotCallback.Main or TelegramBotCallback.Noop)
            {
                if (data == TelegramBotCallback.Main)
                {
                    await _menu.SendMainMenuAsync(chatId.Value, admin, cancellationToken);
                }

                return;
            }

            if (data == TelegramBotCallback.AdminLink)
            {
                await _menu.SendAdminLinkAsync(chatId.Value, cancellationToken);
                return;
            }

            if (data is TelegramBotCallback.Settings
                or TelegramBotCallback.SettingsCsvOn
                or TelegramBotCallback.SettingsCsvOff)
            {
                await _settings.HandleAsync(chatId.Value, admin, data, cancellationToken);
                return;
            }

            if (data.StartsWith(TelegramBotCallback.OrdersPagePrefix, StringComparison.Ordinal))
            {
                var page = int.TryParse(data[TelegramBotCallback.OrdersPagePrefix.Length..], out var p) ? p : 1;
                await _orders.SendPageAsync(chatId.Value, page, cancellationToken);
                return;
            }

            if (data.StartsWith(TelegramBotCallback.OrderOpenPrefix, StringComparison.Ordinal))
            {
                var id = TelegramBotCallback.DecodeGuid(data[TelegramBotCallback.OrderOpenPrefix.Length..]);
                if (id is null)
                {
                    await bot.SendMessage(chatId.Value, "Некорректный заказ", cancellationToken: cancellationToken);
                    return;
                }

                await _orders.SendCardAsync(chatId.Value, id.Value, cancellationToken);
                return;
            }

            if (data.StartsWith(TelegramBotCallback.CustomersPagePrefix, StringComparison.Ordinal))
            {
                var page = int.TryParse(data[TelegramBotCallback.CustomersPagePrefix.Length..], out var p) ? p : 1;
                await _customers.SendPageAsync(chatId.Value, page, cancellationToken);
                return;
            }

            if (data.StartsWith(TelegramBotCallback.CustomerOpenPrefix, StringComparison.Ordinal))
            {
                var id = TelegramBotCallback.DecodeGuid(data[TelegramBotCallback.CustomerOpenPrefix.Length..]);
                if (id is null)
                {
                    await bot.SendMessage(chatId.Value, "Некорректный клиент", cancellationToken: cancellationToken);
                    return;
                }

                await _customers.SendCardAsync(chatId.Value, id.Value, cancellationToken);
                return;
            }

            if (data.StartsWith(TelegramBotCallback.AdminsPagePrefix, StringComparison.Ordinal))
            {
                if (admin.Role is not (AdminRole.Admin or AdminRole.SuperAdmin))
                {
                    await bot.SendMessage(chatId.Value, "Недостаточно прав", cancellationToken: cancellationToken);
                    return;
                }

                var page = int.TryParse(data[TelegramBotCallback.AdminsPagePrefix.Length..], out var p) ? p : 1;
                await _admins.SendPageAsync(chatId.Value, page, cancellationToken);
                return;
            }

            _logger.LogDebug("Unhandled callback data: {Data}", data);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Callback handling failed: {Data}", data);
            try
            {
                await bot.SendMessage(
                    chatId.Value,
                    "Ошибка при обработке кнопки. Попробуйте ещё раз или /menu.",
                    cancellationToken: cancellationToken);
            }
            catch
            {
                // ignore
            }
        }
    }
}
