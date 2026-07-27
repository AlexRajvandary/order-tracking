using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Npgsql;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Domain.Entities;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Infrastructure.TelegramBot;

/// <summary>
/// Enqueues daily CSV outbox rows for eligible admins. Actual send is done by
/// <see cref="TelegramOutboxProcessorHostedService"/> via FOR UPDATE SKIP LOCKED.
/// </summary>
public sealed class TelegramDailyOrdersCsvBackgroundService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(1);

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private readonly ILogger<TelegramDailyOrdersCsvBackgroundService> _logger;
    private readonly IServiceScopeFactory _scopeFactory;

    public TelegramDailyOrdersCsvBackgroundService(
        IServiceScopeFactory scopeFactory,
        ILogger<TelegramDailyOrdersCsvBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await TickAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Daily Telegram CSV enqueue job failed");
            }

            try
            {
                await Task.Delay(Interval, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }
    }

    private async Task TickAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var bot = scope.ServiceProvider.GetRequiredService<TelegramAdminBotService>();
        if (!bot.IsEnabled)
        {
            return;
        }

        var outbox = scope.ServiceProvider.GetRequiredService<ITelegramOutboxRepository>();
        var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(now);
        var todayText = today.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

        var candidates = await bot.GetDailyCsvRecipientsAsync(now, cancellationToken);
        foreach (var (adminId, telegramId, _) in candidates)
        {
            var dedupKey = TelegramOutboxDedupKeys.DailyCsv(adminId, today);
            var alreadyQueuedOrSent = await outbox.ExistsByDedupAsync(
                TelegramOutboxKinds.DailyOrdersCsv,
                dedupKey,
                [TelegramOutboxStatus.Pending, TelegramOutboxStatus.Processing, TelegramOutboxStatus.Sent],
                cancellationToken);

            if (alreadyQueuedOrSent)
            {
                continue;
            }

            var payload = new TelegramDailyOrdersCsvPayload(adminId, telegramId, todayText);
            outbox.Add(new TelegramOutboxMessage
            {
                Id = Guid.NewGuid(),
                Kind = TelegramOutboxKinds.DailyOrdersCsv,
                PayloadJson = JsonSerializer.Serialize(payload, JsonOptions),
                Status = TelegramOutboxStatus.Pending,
                DedupKey = dedupKey,
                CreatedAt = DateTimeOffset.UtcNow,
            });

            try
            {
                await unitOfWork.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException ex) when (IsUniqueViolation(ex))
            {
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to enqueue daily CSV for admin {AdminId}", adminId);
            }
        }
    }

    private static bool IsUniqueViolation(DbUpdateException ex)
    {
        for (var inner = ex.InnerException; inner is not null; inner = inner.InnerException)
        {
            if (inner is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
            {
                return true;
            }
        }

        return false;
    }
}
