using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Domain.Entities;
using OrderTracking.Domain.Enums;

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

        var outbox = scope.ServiceProvider.GetRequiredService<ITelegramOutboxRepository>();
        var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

        // Recover rows stuck in Processing after a crash mid-batch.
        var staleBefore = DateTimeOffset.UtcNow.AddMinutes(-5);
        await outbox.RecoverStaleProcessingAsync(staleBefore, cancellationToken);
        var batch = await outbox.ClaimPendingBatchAsync(BatchSize, DateTimeOffset.UtcNow, cancellationToken);
        if (batch.Count == 0)
        {
            return 0;
        }

        foreach (var message in batch)
        {
            try
            {
                await DispatchAsync(bot, message, cancellationToken);
                await outbox.MarkSentAsync(message, DateTimeOffset.UtcNow, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Telegram outbox message {MessageId} failed", message.Id);
                await outbox.MarkFailedAsync(message, Truncate(ex.Message, 2000), MaxAttempts, cancellationToken);
            }
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);
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
                    payload.Phone,
                    payload.Telegram,
                    payload.WhatsApp,
                    payload.Vk,
                    payload.Address,
                    payload.Images,
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
            case TelegramOutboxKinds.ProductImportCompleted:
            {
                var payload = JsonSerializer.Deserialize<TelegramProductImportCompletedPayload>(
                    message.PayloadJson,
                    JsonOptions)
                    ?? throw new InvalidOperationException("Invalid product_import_completed payload");
                await bot.SendProductImportCompletedNotifyAsync(
                    payload.InsertedCount,
                    cancellationToken);
                break;
            }
            case TelegramOutboxKinds.CrawlerJobStarted:
            {
                var payload = JsonSerializer.Deserialize<TelegramCrawlerJobStartedPayload>(
                    message.PayloadJson,
                    JsonOptions)
                    ?? throw new InvalidOperationException("Invalid crawler_job_started payload");
                await bot.SendCrawlerJobStartedNotifyAsync(
                    payload.Url,
                    payload.Category,
                    cancellationToken);
                break;
            }
            case TelegramOutboxKinds.CrawlerJobFinished:
            {
                var payload = JsonSerializer.Deserialize<TelegramCrawlerJobFinishedPayload>(
                    message.PayloadJson,
                    JsonOptions)
                    ?? throw new InvalidOperationException("Invalid crawler_job_finished payload");
                await bot.SendCrawlerJobFinishedNotifyAsync(
                    payload.InsertedCount,
                    payload.Category,
                    cancellationToken);
                break;
            }
            default:
                throw new InvalidOperationException($"Unknown outbox kind '{message.Kind}'");
        }
    }

    private static string Truncate(string value, int max) =>
        value.Length <= max ? value : value[..max];
}
