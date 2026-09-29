using OrderTracking.Domain.Common;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Domain.Entities;

public sealed class OrderItemProcurement : AuditableEntity
{
    public Guid OrderItemId { get; set; }
    public string? PurchaseUrl { get; set; }
    public PurchaseStatus PurchaseStatus { get; set; } = PurchaseStatus.Pending;
    public string? ArrivalUrl { get; set; }
    public ArrivalStatus ArrivalStatus { get; set; } = ArrivalStatus.Pending;
    public string? ShipmentUrl { get; set; }
    public ShipmentStatus ShipmentStatus { get; set; } = ShipmentStatus.AwaitingShipment;

    public OrderItem OrderItem { get; set; } = null!;
}
