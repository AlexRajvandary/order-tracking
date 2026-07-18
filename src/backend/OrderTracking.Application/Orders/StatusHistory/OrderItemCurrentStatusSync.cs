using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Domain.Entities;

namespace OrderTracking.Application.Orders.StatusHistory;

public static class OrderItemCurrentStatusSync
{
    public static async Task SyncFromPublishedHistoryAsync(
        IApplicationDbContext context,
        OrderItem item,
        CancellationToken cancellationToken)
    {
        // Tracked query so in-memory IsPublished changes (before SaveChanges) are visible.
        var latest = await context.OrderItemStatusHistories
            .Where(h => h.OrderItemId == item.Id && h.IsPublished)
            .OrderByDescending(h => h.ChangedAt)
            .ThenByDescending(h => h.Id)
            .Select(h => new
            {
                h.StatusDefinitionId,
                h.StatusText,
                h.ChangedAt,
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (latest is null)
        {
            item.CurrentStatusId = null;
            item.CurrentStatusText = null;
            item.CurrentStatusUpdatedAt = null;
            return;
        }

        item.CurrentStatusId = latest.StatusDefinitionId;
        item.CurrentStatusText = latest.StatusText;
        item.CurrentStatusUpdatedAt = latest.ChangedAt;
    }

    public static void ApplyPublished(OrderItem item, OrderItemStatusHistory history)
    {
        item.CurrentStatusId = history.StatusDefinitionId;
        item.CurrentStatusText = history.StatusText;
        item.CurrentStatusUpdatedAt = history.ChangedAt;
    }
}
