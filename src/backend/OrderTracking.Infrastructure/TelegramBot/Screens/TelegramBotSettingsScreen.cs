using Microsoft.Extensions.DependencyInjection;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Infrastructure.TelegramBot.Ui;
using Telegram.Bot.Types.ReplyMarkups;

namespace OrderTracking.Infrastructure.TelegramBot.Screens;

internal sealed class TelegramBotSettingsScreen
{
    private readonly TelegramBotRuntime _runtime;
    private readonly TelegramUiService _ui;

    public TelegramBotSettingsScreen(TelegramBotRuntime runtime, TelegramUiService ui)
    {
        _runtime = runtime;
        _ui = ui;
    }

    public async Task HandleAsync(
        long chatId,
        int? messageId,
        TelegramBotAdminContext admin,
        string data,
        CancellationToken cancellationToken)
    {
        using var scope = _runtime.ScopeFactory.CreateScope();
        var admins = scope.ServiceProvider.GetRequiredService<IAdminUserRepository>();
        var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
        var user = await admins.GetByIdTrackedAsync(admin.AdminId, cancellationToken);
        if (user is null)
        {
            return;
        }

        var settings = TelegramBotUserSettings.FromJson(user.SettingsJson);

        if (data == TelegramBotCallback.SettingsCsvOn)
        {
            settings.DailyOrdersCsvEnabled = true;
            user.SettingsJson = TelegramBotUserSettings.MergeInto(user.SettingsJson, settings);
            await unitOfWork.SaveChangesAsync(cancellationToken);
        }
        else if (data == TelegramBotCallback.SettingsCsvOff)
        {
            settings.DailyOrdersCsvEnabled = false;
            user.SettingsJson = TelegramBotUserSettings.MergeInto(user.SettingsJson, settings);
            await unitOfWork.SaveChangesAsync(cancellationToken);
        }

        settings = TelegramBotUserSettings.FromJson(user.SettingsJson);
        var enabled = settings.DailyOrdersCsvEnabled;
        var status = enabled ? "включён" : "выключен";
        var text =
            "⚙️ <b>Ежедневный CSV</b>\n\n" +
            $"Статус: <b>{status}</b>\n" +
            $"Время отправки: {settings.DailyOrdersCsvHourUtc:00}:00 UTC";

        var keyboard = new InlineKeyboardMarkup(
        [
            [
                enabled
                    ? InlineKeyboardButton.WithCallbackData("Выключить", TelegramBotCallback.SettingsCsvOff)
                    : InlineKeyboardButton.WithCallbackData("Включить", TelegramBotCallback.SettingsCsvOn)
            ],
            [InlineKeyboardButton.WithCallbackData("🏠 Главное меню", TelegramBotCallback.Main)],
        ]);

        await _ui.RenderAsync(chatId, messageId, text, keyboard, cancellationToken);
    }
}
