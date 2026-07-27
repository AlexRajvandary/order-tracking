using System.Text;
using Microsoft.Extensions.DependencyInjection;
using OrderTracking.Application.Common.Persistence;
using Telegram.Bot;
using Telegram.Bot.Types;

namespace OrderTracking.Infrastructure.TelegramBot.Reports;

internal sealed class TelegramOrdersCsvService
{
    private readonly TelegramBotRuntime _runtime;

    public TelegramOrdersCsvService(TelegramBotRuntime runtime)
    {
        _runtime = runtime;
    }

    public async Task SendDailyOrdersCsvToAdminAsync(
        long telegramId,
        CancellationToken cancellationToken = default)
    {
        if (!_runtime.IsEnabled || _runtime.Client is null)
        {
            return;
        }

        using var scope = _runtime.ScopeFactory.CreateScope();
        var orders = scope.ServiceProvider.GetRequiredService<IOrderRepository>();
        var csv = await BuildOrdersCsvAsync(orders, cancellationToken);
        await using var stream = new MemoryStream(Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(csv)).ToArray());
        var fileName = $"orders-{DateTime.UtcNow:yyyyMMdd}.csv";

        await _runtime.Client.SendDocument(
            telegramId,
            InputFile.FromStream(stream, fileName),
            caption: $"Ежедневный отчёт по заказам ({DateTime.UtcNow:yyyy-MM-dd} UTC)",
            cancellationToken: cancellationToken);
    }

    public async Task<IReadOnlyList<(Guid AdminId, long TelegramId, string SettingsJson)>> GetDailyCsvRecipientsAsync(
        DateTime utcNow,
        CancellationToken cancellationToken)
    {
        using var scope = _runtime.ScopeFactory.CreateScope();
        var admins = await scope.ServiceProvider
            .GetRequiredService<IAdminUserRepository>()
            .ListActiveWithTelegramAsync(cancellationToken);

        var result = new List<(Guid, long, string)>();
        foreach (var admin in admins)
        {
            var settings = TelegramBotUserSettings.FromJson(admin.SettingsJson);
            if (!settings.DailyOrdersCsvEnabled)
            {
                continue;
            }

            if (utcNow.Hour != settings.DailyOrdersCsvHourUtc)
            {
                continue;
            }

            result.Add((admin.Id, admin.TelegramId!.Value, admin.SettingsJson));
        }

        return result;
    }

    private static async Task<string> BuildOrdersCsvAsync(IOrderRepository orders, CancellationToken cancellationToken)
    {
        var rows = await orders.GetAllForTelegramCsvAsync(cancellationToken);

        var sb = new StringBuilder();
        sb.AppendLine("TrackingCode,Status,CreatedAtUtc,UpdatedAtUtc,CustomerName,Phone,Telegram,Email,ItemsCount,AdminNotes");
        foreach (var o in rows)
        {
            sb.Append(Csv(o.TrackingCode)).Append(',');
            sb.Append(Csv(o.Status)).Append(',');
            sb.Append(Csv(o.CreatedAt.ToString("o"))).Append(',');
            sb.Append(Csv(o.UpdatedAt.ToString("o"))).Append(',');
            sb.Append(Csv(o.CustomerName)).Append(',');
            sb.Append(Csv(o.CustomerPhone)).Append(',');
            sb.Append(Csv(o.CustomerTelegram)).Append(',');
            sb.Append(Csv(o.CustomerEmail)).Append(',');
            sb.Append(o.ItemsCount).Append(',');
            sb.Append(Csv(o.AdminNotes));
            sb.AppendLine();
        }

        return sb.ToString();
    }

    private static string Csv(string? value)
    {
        value ??= string.Empty;
        if (value.Contains('"') || value.Contains(',') || value.Contains('\n') || value.Contains('\r'))
        {
            return "\"" + value.Replace("\"", "\"\"") + "\"";
        }

        return value;
    }
}
