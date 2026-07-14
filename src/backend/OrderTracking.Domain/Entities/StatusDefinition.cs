using OrderTracking.Domain.Common;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Domain.Entities;

public class StatusDefinition : AuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public OrderItemType? ItemType { get; set; }
    public string? Color { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsFinal { get; set; }

    public ICollection<OrderItem> OrderItems { get; set; } = [];
    public ICollection<OrderItemStatusHistory> StatusHistory { get; set; } = [];
}
