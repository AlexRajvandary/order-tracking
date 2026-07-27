using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using OrderTracking.Domain.Entities;
using OrderTracking.Domain.Enums;
using OrderTracking.Infrastructure.Persistence;

namespace OrderTracking.Infrastructure.TelegramBot;

/// <summary>
/// Claims pending outbox rows with FOR UPDATE SKIP LOCKED so multiple API instances
/// can process without duplicate sends.
/// </summary>
public sealed class TelegramOutboxProcessorHostedService : BackgroundService
{
    private const int BatchSize = 20;
    private const int MaxAttempts = 8;
    private static readonly TimeSpan IdleDelay = TimeSpan.FromSeconds(2);
    private static readonly TimeSpan BusyDelay = TimeSpan.FromMilliseconds(200);

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<TelegramOutboxProcessorHostedService> _logger;

    public TelegramOutboxProcessorHostedService(
        IServiceScopeFactory scopeFactory,
        ILogger<TelegramOutboxProcessorHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var processed = 0;
            try
            {
                processed = await ProcessBatchAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Telegram outbox batch failed");
            }

            try
            {
                await Task.Delay(processed > 0 ? BusyDelay : IdleDelay, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }
    }

    private async Task<int> ProcessBatchAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var bot = scope.ServiceProvider.GetRequiredService<TelegramAdminBotService>();
        if (!bot.IsEnabled)
        {
            return 0;
        }

        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        // Recover rows stuck in Processing after a crash mid-batch.
        var staleBefore = DateTimeOffset.UtcNow.AddMinutes(-5);
        await db.TelegramOutboxMessages
            .Where(m => m.Status == TelegramOutboxStatus.Processing && m.LockedAt != null && m.LockedAt < staleBefore)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(m => m.Status, TelegramOutboxStatus.Pending)
                    .SetProperty(m => m.LockedAt, (DateTimeOffset?)null),
                cancellationToken);

        List<TelegramOutboxMessage> batch;

        await using (var tx = await db.Database.BeginTransactionAsync(cancellationToken))
        {
            batch = await db.TelegramOutboxMessages
                .FromSqlRaw(
                    """
                    SELECT *
                    FROM telegram_outbox_messages
                    WHERE "Status" = {0}
                    ORDER BY "CreatedAt", "Id"
                    FOR UPDATE SKIP LOCKED
                    LIMIT {1}
                    """,
                    (short)TelegramOutboxStatus.Pending,
                    BatchSize)
                .AsTracking()
                .ToListAsync(cancellationToken);

            if (batch.Count == 0)
            {
                await tx.CommitAsync(cancellationToken);
                return 0;
            }

            var now = DateTimeOffset.UtcNow;
            foreach (var message in batch)
            {
                message.Status = TelegramOutboxStatus.Processing;
                message.LockedAt = now;
                message.AttemptCount += 1;
            }

            await db.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }

        foreach (var message in batch)
        {
            try
            {
                await DispatchAsync(bot, message, cancellationToken);
                message.Status = TelegramOutboxStatus.Sent;
                message.ProcessedAt = DateTimeOffset.UtcNow;
                message.LastError = null;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Telegram outbox message {MessageId} failed", message.Id);
                message.LastError = Truncate(ex.Message, 2000);
                message.Status = message.AttemptCount >= MaxAttempts
                    ? TelegramOutboxStatus.Dead
                    : TelegramOutboxStatus.Pending;
                message.LockedAt = null;
            }
        }

        await db.SaveChangesAsync(cancellationToken);
        return batch.Count;
    }

    private static async Task DispatchAsync(
        TelegramAdminBotService bot,
        TelegramOutboxMessage message,
        CancellationToken cancellationToken)
    {
        switch (message.Kind)
        {
            case TelegramOutboxKinds.OrderCreated:
            {
                var payload = JsonSerializer.Deserialize<TelegramOrderCreatedPayload>(message.PayloadJson, JsonOptions)
                    ?? throw new InvalidOperationException("Invalid order_created payload");
                await bot.SendOrderCreatedNotifyAsync(
                    payload.OrderId,
                    payload.TrackingCode,
                    payload.CustomerName,
                    cancellationToken);
                break;
            }
            case TelegramOutboxKinds.StatusPublished:
            {
                var payload = JsonSerializer.Deserialize<TelegramStatusPublishedPayload>(message.PayloadJson, JsonOptions)
                    ?? throw new InvalidOperationException("Invalid status_published payload");
                await bot.SendStatusPublishedNotifyAsync(
                    new TelegramStatusPublishedWorkItem(
                        payload.OrderId,
                        payload.TrackingCode,
                        payload.StatusText,
                        payload.OrderItemName,
                        payload.Country,
                        payload.Location,
                        payload.StatusHistoryId),
                    cancellationToken);
                break;
            }
            case TelegramOutboxKinds.DailyOrdersCsv:
            {
                var payload = JsonSerializer.Deserialize<TelegramDailyOrdersCsvPayload>(message.PayloadJson, JsonOptions)
                    ?? throw new InvalidOperationException("Invalid daily_orders_csv payload");
                await bot.SendDailyOrdersCsvToAdminAsync(payload.TelegramId, cancellationToken);
                break;
            }
            default:
                throw new InvalidOperationException($"Unknown outbox kind '{message.Kind}'");
        }
    }

    private static string Truncate(string value, int max) =>
        value.Length <= max ? value : value[..max];
}
