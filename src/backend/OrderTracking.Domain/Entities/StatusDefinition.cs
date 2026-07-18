using OrderTracking.Domain.Common;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Domain.Entities;

public class StatusDefinition : AuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public OrderItemType? ItemType { get; set; }
    public string? Color { get; set; }
    public string? DefaultCountry { get; set; }
    public string? DefaultLocation { get; set; }
    /// <summary>Days after order creation when this status should auto-publish. Null = manual only.</summary>
    public int? PublishAfterDays { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsFinal { get; set; }

    public ICollection<OrderItem> OrderItems { get; set; } = [];
    public ICollection<OrderItemStatusHistory> StatusHistory { get; set; } = [];
}
