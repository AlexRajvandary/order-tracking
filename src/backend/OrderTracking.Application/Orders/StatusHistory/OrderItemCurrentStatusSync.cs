using OrderTracking.Application.Common.Persistence;
using OrderTracking.Domain.Entities;

namespace OrderTracking.Application.Orders.StatusHistory;

public static class OrderItemCurrentStatusSync
{
    public static async Task SyncFromPublishedHistoryAsync(
        IOrderRepository orderRepository,
        OrderItem item,
        CancellationToken cancellationToken)
    {
        // Tracked query so in-memory IsPublished changes (before SaveChanges) are visible.
        var latest = await orderRepository.GetLatestPublishedStatusForItemAsync(
            item.Id,
            cancellationToken);

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
