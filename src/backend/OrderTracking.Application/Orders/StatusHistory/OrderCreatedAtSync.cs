using OrderTracking.Application.Common.Persistence;
using OrderTracking.Domain.Entities;

namespace OrderTracking.Application.Orders.StatusHistory;

/// <summary>
/// Keeps <see cref="Order.CreatedAt"/> aligned with the earliest status history date.
/// If there are no statuses (or only future-dated ones), CreatedAt stays as set on create.
/// When a status is backdated before CreatedAt, CreatedAt moves to the earliest timeline date.
/// </summary>
public static class OrderCreatedAtSync
{
    public static async Task AlignToEarliestStatusAsync(
        IOrderRepository orderRepository,
        Order order,
        DateTimeOffset now,
        CancellationToken cancellationToken,
        DateTimeOffset? pendingChangedAt = null,
        Guid? excludeHistoryId = null)
    {
        var earliest = await orderRepository.GetEarliestStatusChangedAtForOrderAsync(
            order.Id,
            excludeHistoryId,
            cancellationToken);

        if (pendingChangedAt is { } pending)
        {
            earliest = earliest is null || pending < earliest ? pending : earliest;
        }

        // Only past/current timeline dates define order creation — not future schedules.
        if (earliest is { } date && date <= now)
        {
            order.CreatedAt = date;
        }
    }
}
