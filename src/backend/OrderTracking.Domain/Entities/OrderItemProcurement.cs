using OrderTracking.Domain.Common;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Domain.Entities;

public sealed class OrderItemProcurement : AuditableEntity
{
    public Guid OrderItemId { get; set; }
    public string? PurchaseUrl { get; set; }
    public PurchaseStatus PurchaseStatus { get; set; } = PurchaseStatus.Pending;
    public decimal? PurchasePrice { get; set; }
    public string? SellerOrderNumber { get; set; }
    public string? WarehouseTrackingNumber { get; set; }
    public ArrivalStatus ArrivalStatus { get; set; } = ArrivalStatus.Pending;
    public DateOnly? WarehouseReceivedAt { get; set; }
    public WarehouseCondition? WarehouseCondition { get; set; }
    public string? ShippingTrackingNumber { get; set; }
    public ShipmentStatus ShipmentStatus { get; set; } = ShipmentStatus.AwaitingShipment;
    public string? ShippingMethod { get; set; }
    public decimal? ShippingWeight { get; set; }
    public decimal? ShippingCost { get; set; }
    public DateOnly? ShippedAt { get; set; }

    public OrderItem OrderItem { get; set; } = null!;
    public ICollection<OrderItemProcurementAttachment> Attachments { get; set; } = [];
}
