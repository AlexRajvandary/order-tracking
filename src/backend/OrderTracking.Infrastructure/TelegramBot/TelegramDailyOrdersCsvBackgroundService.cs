using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Npgsql;
using OrderTracking.Domain.Entities;
using OrderTracking.Domain.Enums;
using OrderTracking.Infrastructure.Persistence;

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

        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(now);
        var todayText = today.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

        var candidates = await bot.GetDailyCsvRecipientsAsync(now, cancellationToken);
        foreach (var (adminId, telegramId, _) in candidates)
        {
            var dedupKey = TelegramOutboxDedupKeys.DailyCsv(adminId, today);
            var alreadyQueuedOrSent = await db.TelegramOutboxMessages.AsNoTracking()
                .AnyAsync(
                    m => m.Kind == TelegramOutboxKinds.DailyOrdersCsv
                         && m.DedupKey == dedupKey
                         && (m.Status == TelegramOutboxStatus.Pending
                             || m.Status == TelegramOutboxStatus.Processing
                             || m.Status == TelegramOutboxStatus.Sent),
                    cancellationToken);

            if (alreadyQueuedOrSent)
            {
                continue;
            }

            var payload = new TelegramDailyOrdersCsvPayload(adminId, telegramId, todayText);
            db.TelegramOutboxMessages.Add(new TelegramOutboxMessage
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
                await db.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException ex) when (IsUniqueViolation(ex))
            {
                db.ChangeTracker.Clear();
            }
            catch (Exception ex)
            {
                db.ChangeTracker.Clear();
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
