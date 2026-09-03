using Microsoft.Extensions.Logging;
using OrderTracking.Domain.Enums;
using OrderTracking.Infrastructure.TelegramBot.Auth;
using OrderTracking.Infrastructure.TelegramBot.Screens;
using OrderTracking.Infrastructure.TelegramBot.Ui;
using Telegram.Bot;
using Telegram.Bot.Types;
using Telegram.Bot.Types.ReplyMarkups;

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
    private readonly TelegramUiService _ui;

    public TelegramBotUpdateRouter(
        TelegramBotRuntime runtime,
        TelegramBotAdminResolver adminResolver,
        TelegramBotMenuScreen menu,
        TelegramBotOrdersScreen orders,
        TelegramBotCustomersScreen customers,
        TelegramBotAdminsScreen admins,
        TelegramBotSettingsScreen settings,
        TelegramUiService ui,
        ILogger<TelegramBotUpdateRouter> logger)
    {
        _runtime = runtime;
        _adminResolver = adminResolver;
        _menu = menu;
        _orders = orders;
        _customers = customers;
        _admins = admins;
        _settings = settings;
        _ui = ui;
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

        // First navigation message (or after /start text) — Send, then edits reuse MessageId.
        await _menu.RenderMainMenuAsync(message.Chat.Id, messageId: null, admin, cancellationToken);
    }

    private async Task HandleCallbackAsync(CallbackQuery callback, CancellationToken cancellationToken)
    {
        var bot = _runtime.RequireClient();

        var chatId = callback.Message?.Chat?.Id ?? callback.From?.Id;
        var messageId = callback.Message?.MessageId;
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

        var data = callback.Data ?? string.Empty;
        _logger.LogInformation(
            "Telegram callback action={Action} chat={ChatId} message={MessageId}",
            data,
            chatId.Value,
            messageId);

        var admin = await _adminResolver.ResolveAsync(callback.From.Id, cancellationToken);
        if (admin is null)
        {
            _logger.LogWarning("Unauthorized Telegram callback from {UserId}", callback.From.Id);
            try
            {
                await bot.AnswerCallbackQuery(
                    callback.Id,
                    "Доступ запрещён. Привяжите Telegram в админке.",
                    showAlert: true,
                    cancellationToken: cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to answer unauthorized callback {CallbackId}", callback.Id);
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

        // No MessageId: cannot edit (e.g. very old inline). Open a fresh navigation message.
        if (messageId is null)
        {
            _logger.LogWarning("Callback {CallbackId} without message id; sending fresh menu", callback.Id);
            await _menu.RenderMainMenuAsync(chatId.Value, messageId: null, admin, cancellationToken);
            return;
        }

        try
        {
            if (data == TelegramBotCallback.Noop)
            {
                return;
            }

            if (data.StartsWith(TelegramBotCallback.OrderNotificationOpenPrefix, StringComparison.Ordinal))
            {
                var payload = data[TelegramBotCallback.OrderNotificationOpenPrefix.Length..];
                var orderId = TelegramBotCallback.DecodeGuid(payload);
                if (orderId is null)
                {
                    await _ui.RenderAsync(
                        chatId.Value,
                        messageId,
                        "Некорректный заказ",
                        TelegramBotKeyboards.MainMenu(admin),
                        cancellationToken);
                    return;
                }

                await _orders.RenderNotificationCardAsync(
                    chatId.Value,
                    messageId.Value,
                    orderId.Value,
                    cancellationToken);
                return;
            }

            if (data.StartsWith(TelegramBotCallback.OrderNotificationBackPrefix, StringComparison.Ordinal))
            {
                var payload = data[TelegramBotCallback.OrderNotificationBackPrefix.Length..];
                var orderId = TelegramBotCallback.DecodeGuid(payload);
                if (orderId is null)
                {
                    await _ui.RenderAsync(
                        chatId.Value,
                        messageId,
                        "Некорректный заказ",
                        TelegramBotKeyboards.MainMenu(admin),
                        cancellationToken);
                    return;
                }

                await _orders.RenderOrderCreatedNotificationAsync(
                    chatId.Value,
                    messageId.Value,
                    orderId.Value,
                    cancellationToken);
                return;
            }

            // Regular bot navigation sends a new message. Only a new-order notification
            // and its Back button edit the notification in place.
            int? navigationMessageId = null;

            if (data == TelegramBotCallback.Main)
            {
                await _menu.RenderMainMenuAsync(chatId.Value, navigationMessageId, admin, cancellationToken);
                return;
            }

            if (data == TelegramBotCallback.AdminLink)
            {
                await _menu.RenderAdminLinkAsync(chatId.Value, navigationMessageId, cancellationToken);
                return;
            }

            if (data is TelegramBotCallback.Settings
                or TelegramBotCallback.SettingsCsvOn
                or TelegramBotCallback.SettingsCsvOff)
            {
                await _settings.HandleAsync(chatId.Value, navigationMessageId, admin, data, cancellationToken);
                return;
            }

            if (data.StartsWith(TelegramBotCallback.OrdersPagePrefix, StringComparison.Ordinal))
            {
                var page = int.TryParse(data[TelegramBotCallback.OrdersPagePrefix.Length..], out var p) ? p : 1;
                await _orders.RenderPageAsync(chatId.Value, navigationMessageId, page, cancellationToken);
                return;
            }

            if (data.StartsWith(TelegramBotCallback.OrderOpenPrefix, StringComparison.Ordinal))
            {
                var payload = data[TelegramBotCallback.OrderOpenPrefix.Length..];
                if (!TelegramBotCallback.TryParseEntityOpen(payload, out var id, out var page))
                {
                    await _ui.RenderAsync(
                        chatId.Value,
                        navigationMessageId,
                        "Некорректный заказ",
                        new InlineKeyboardMarkup(
                            InlineKeyboardButton.WithCallbackData("🏠 Главное меню", TelegramBotCallback.Main)),
                        cancellationToken);
                    return;
                }

                await _orders.RenderCardAsync(chatId.Value, navigationMessageId, id, page, cancellationToken);
                return;
            }

            if (data.StartsWith(TelegramBotCallback.CustomersPagePrefix, StringComparison.Ordinal))
            {
                var page = int.TryParse(data[TelegramBotCallback.CustomersPagePrefix.Length..], out var p) ? p : 1;
                await _customers.RenderPageAsync(chatId.Value, navigationMessageId, page, cancellationToken);
                return;
            }

            if (data.StartsWith(TelegramBotCallback.CustomerOpenPrefix, StringComparison.Ordinal))
            {
                var payload = data[TelegramBotCallback.CustomerOpenPrefix.Length..];
                if (!TelegramBotCallback.TryParseEntityOpen(payload, out var id, out var page))
                {
                    await _ui.RenderAsync(
                        chatId.Value,
                        navigationMessageId,
                        "Некорректный клиент",
                        new InlineKeyboardMarkup(
                            InlineKeyboardButton.WithCallbackData("🏠 Главное меню", TelegramBotCallback.Main)),
                        cancellationToken);
                    return;
                }

                await _customers.RenderCardAsync(chatId.Value, navigationMessageId, id, page, cancellationToken);
                return;
            }

            if (data.StartsWith(TelegramBotCallback.AdminsPagePrefix, StringComparison.Ordinal))
            {
                if (admin.Role is not (AdminRole.Admin or AdminRole.SuperAdmin))
                {
                    _logger.LogWarning(
                        "Forbidden admins screen for role {Role} user {UserId}",
                        admin.Role,
                        callback.From.Id);
                    await _ui.RenderAsync(
                        chatId.Value,
                        navigationMessageId,
                        "Недостаточно прав",
                        TelegramBotKeyboards.MainMenu(admin),
                        cancellationToken);
                    return;
                }

                var page = int.TryParse(data[TelegramBotCallback.AdminsPagePrefix.Length..], out var p) ? p : 1;
                await _admins.RenderPageAsync(chatId.Value, navigationMessageId, page, cancellationToken);
                return;
            }

            _logger.LogDebug("Unhandled callback data: {Data}", data);
            await _ui.RenderAsync(
                chatId.Value,
                navigationMessageId,
                "Это меню устарело. Откройте актуальное меню.",
                TelegramBotKeyboards.MainMenu(admin),
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Callback handling failed: {Data}", data);
            try
            {
                await _ui.RenderAsync(
                    chatId.Value,
                    messageId: null,
                    "Ошибка при обработке кнопки. Попробуйте ещё раз или отправьте любое сообщение.",
                    TelegramBotKeyboards.MainMenu(admin),
                    cancellationToken);
            }
            catch (Exception renderEx)
            {
                _logger.LogWarning(renderEx, "Failed to render callback error UI");
            }
        }
    }
}
