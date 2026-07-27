using Microsoft.Extensions.DependencyInjection;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Persistence;
using Telegram.Bot;
using Telegram.Bot.Types.Enums;
using Telegram.Bot.Types.ReplyMarkups;

namespace OrderTracking.Infrastructure.TelegramBot.Screens;

internal sealed class TelegramBotSettingsScreen
{
    private readonly TelegramBotRuntime _runtime;

    public TelegramBotSettingsScreen(TelegramBotRuntime runtime)
    {
        _runtime = runtime;
    }

    public async Task HandleAsync(
        long chatId,
        TelegramBotAdminContext admin,
        string data,
        CancellationToken cancellationToken)
    {
        var bot = _runtime.RequireClient();
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
        var status = settings.DailyOrdersCsvEnabled
            ? $"включена (каждый день в {settings.DailyOrdersCsvHourUtc:00}:00 UTC)"
            : "выключена";

        var keyboard = new InlineKeyboardMarkup(
        [
            [
                settings.DailyOrdersCsvEnabled
                    ? InlineKeyboardButton.WithCallbackData("Выключить ежедневный CSV", TelegramBotCallback.SettingsCsvOff)
                    : InlineKeyboardButton.WithCallbackData("Включить ежедневный CSV", TelegramBotCallback.SettingsCsvOn)
            ],
            [InlineKeyboardButton.WithCallbackData("« В меню", TelegramBotCallback.Main)],
        ]);

        await bot.SendMessage(
            chatId,
            $"⚙️ Настройки бота\nЕжедневная CSV-выгрузка всех заказов: <b>{status}</b>",
            ParseMode.Html,
            replyMarkup: keyboard,
            cancellationToken: cancellationToken);
    }
}
