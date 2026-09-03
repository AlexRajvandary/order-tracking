using OrderTracking.Domain.Common;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Domain.Entities;

public class OrderItem : AuditableEntity
{
    public Guid OrderId { get; set; }
    public OrderItemType ItemType { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    public string? SourceUrl { get; set; }

    public int Quantity { get; set; } = 1;
    public decimal? UnitPrice { get; set; }
    public string? CurrencyCode { get; set; }
    public int SortOrder { get; set; }
    public Guid? CurrentStatusId { get; set; }
    public string? CurrentStatusText { get; set; }
    public DateTimeOffset? CurrentStatusUpdatedAt { get; set; }

    public Order Order { get; set; } = null!;
    public StatusDefinition? CurrentStatus { get; set; }
    public ICollection<OrderItemStatusHistory> StatusHistory { get; set; } = [];
}
