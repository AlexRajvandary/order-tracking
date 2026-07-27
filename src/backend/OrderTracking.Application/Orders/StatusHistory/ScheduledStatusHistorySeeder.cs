using OrderTracking.Application.Common.Persistence;
using OrderTracking.Domain.Entities;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Application.Orders.StatusHistory;

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

        var itemTypes = items.Select(i => i.ItemType).Distinct().ToList();

        var definitions = await statusDefinitionRepository.GetScheduledForItemTypesAsync(
            itemTypes,
            cancellationToken);

        if (definitions.Count == 0)
        {
            return;
        }

        foreach (var item in items)
        {
            foreach (var definition in definitions.Where(d => MatchesItemType(d.ItemType, item.ItemType)))
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

    private static bool MatchesItemType(OrderItemType? definitionType, OrderItemType itemType) =>
        definitionType is null || definitionType == itemType;
}
