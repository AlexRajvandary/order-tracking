using OrderTracking.Application.Common.Persistence;
using OrderTracking.Domain.Entities;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Application.Orders.StatusHistory;

// Устаревшее автосоздание запланированной истории статусов заказа; оставлено для чтения старых данных и совместимости.
public static class ScheduledStatusHistorySeeder
{
    public static async Task SeedForItemsAsync(
        IOrderRepository orderRepository,
        IStatusDefinitionRepository statusDefinitionRepository,
        Order order,
        IReadOnlyList<OrderItem> items,
        Guid changedByAdminId,
        CancellationToken cancellationToken)
    {
        if (items.Count == 0)
        {
            return;
        }

        var definitions = await statusDefinitionRepository.GetScheduledAsync(cancellationToken);

        if (definitions.Count == 0)
        {
            return;
        }

        foreach (var item in items)
        {
            foreach (var definition in definitions)
            {
                var publishAt = order.CreatedAt.AddDays(definition.PublishAfterDays!.Value);
                orderRepository.AddStatusHistory(new OrderItemStatusHistory
                {
                    Id = Guid.NewGuid(),
                    OrderItemId = item.Id,
                    StatusDefinitionId = definition.Id,
                    StatusText = definition.Name,
                    Country = definition.DefaultCountry,
                    Location = definition.DefaultLocation,
                    PublishAt = publishAt,
                    IsPublished = false,
                    ChangedByAdminId = changedByAdminId,
                    ChangedAt = publishAt,
                });
            }
        }
    }

}
