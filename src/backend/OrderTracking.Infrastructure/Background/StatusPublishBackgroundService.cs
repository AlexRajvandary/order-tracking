using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Realtime;
using OrderTracking.Application.Orders.StatusHistory;
using OrderTracking.Infrastructure.Persistence;

namespace OrderTracking.Infrastructure.Background;

public sealed class StatusPublishBackgroundService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(1);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<StatusPublishBackgroundService> _logger;

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
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var dateTime = scope.ServiceProvider.GetRequiredService<IDateTimeProvider>();
        var notifier = scope.ServiceProvider.GetRequiredService<IRealtimeNotifier>();

        var now = dateTime.UtcNow;

        var due = await context.OrderItemStatusHistories
            .Include(h => h.OrderItem)
            .Where(h => !h.IsPublished && h.PublishAt != null && h.PublishAt <= now)
            .OrderBy(h => h.PublishAt)
            .ThenBy(h => h.Id)
            .ToListAsync(cancellationToken);

        if (due.Count == 0)
        {
            return;
        }

        var affectedOrderIds = new HashSet<Guid>();

        foreach (var history in due)
        {
            history.IsPublished = true;
            history.ChangedAt = history.PublishAt ?? now;
            await OrderItemCurrentStatusSync.SyncFromPublishedHistoryAsync(
                context,
                history.OrderItem,
                cancellationToken);
            affectedOrderIds.Add(history.OrderItem.OrderId);

            var order = await context.Orders
                .FirstOrDefaultAsync(o => o.Id == history.OrderItem.OrderId, cancellationToken);
            if (order is not null)
            {
                order.UpdatedAt = now;
            }
        }

        await context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Published {Count} scheduled status history entries", due.Count);

        await notifier.NotifyAdminTopicsAsync(
            [RealtimeTopics.Orders, RealtimeTopics.Dashboard],
            cancellationToken);

        foreach (var orderId in affectedOrderIds)
        {
            await notifier.NotifyTrackingChangedAsync(orderId, cancellationToken);
        }
    }
}
