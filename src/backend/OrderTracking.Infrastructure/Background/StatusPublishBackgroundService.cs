using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Common.Realtime;
using OrderTracking.Application.Orders.StatusHistory;

namespace OrderTracking.Infrastructure.Background;

public sealed class StatusPublishBackgroundService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(1);

    private readonly ILogger<StatusPublishBackgroundService> _logger;
    private readonly IServiceScopeFactory _scopeFactory;

    public StatusPublishBackgroundService(
        IServiceScopeFactory scopeFactory,
        ILogger<StatusPublishBackgroundService> logger)
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
                await PublishDueAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to publish scheduled status history entries");
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

    private async Task PublishDueAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var orderRepository = scope.ServiceProvider.GetRequiredService<IOrderRepository>();
        var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
        var dateTime = scope.ServiceProvider.GetRequiredService<IDateTimeProvider>();
        var notifier = scope.ServiceProvider.GetRequiredService<IRealtimeNotifier>();
        var telegram = scope.ServiceProvider.GetRequiredService<ITelegramAdminNotifier>();

        var now = dateTime.UtcNow;

        var due = await orderRepository.GetDueScheduledHistoriesAsync(now, cancellationToken);

        if (due.Count == 0)
        {
            return;
        }

        var affectedOrderIds = new HashSet<Guid>();
        var telegramEvents = new List<(Guid HistoryId, Guid OrderId, string TrackingCode, string StatusText, string ItemName, string? Country, string? Location)>();
        var publishedCount = 0;

        foreach (var history in due)
        {
            var changedAt = history.PublishAt ?? now;

            // Atomic claim so a concurrent manual publish does not double-apply / double-notify.
            var claimed = await orderRepository.ClaimScheduledHistoryPublishAsync(
                history.Id,
                changedAt,
                cancellationToken);

            if (claimed == 0)
            {
                continue;
            }

            publishedCount++;
            history.IsPublished = true;
            history.ChangedAt = changedAt;

            await OrderItemCurrentStatusSync.SyncFromPublishedHistoryAsync(
                orderRepository,
                history.OrderItem,
                cancellationToken);
            affectedOrderIds.Add(history.OrderItem.OrderId);

            var order = await orderRepository.GetByIdTrackedAsync(
                history.OrderItem.OrderId,
                cancellationToken);
            if (order is not null)
            {
                order.UpdatedAt = now;
                telegramEvents.Add((
                    history.Id,
                    order.Id,
                    order.TrackingCode,
                    history.StatusText,
                    history.OrderItem.Name,
                    history.Country,
                    history.Location));
            }
        }

        if (publishedCount == 0)
        {
            return;
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Published {Count} scheduled status history entries", publishedCount);

        await notifier.NotifyAdminTopicsAsync(
            [RealtimeTopics.Orders, RealtimeTopics.Dashboard],
            cancellationToken);

        foreach (var orderId in affectedOrderIds)
        {
            await notifier.NotifyTrackingChangedAsync(orderId, cancellationToken);
        }

        foreach (var evt in telegramEvents)
        {
            try
            {
                await telegram.NotifyStatusPublishedAsync(
                    evt.OrderId,
                    evt.TrackingCode,
                    evt.StatusText,
                    evt.ItemName,
                    evt.Country,
                    evt.Location,
                    evt.HistoryId,
                    cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Telegram notify failed for history {HistoryId}", evt.HistoryId);
            }
        }
    }
}
