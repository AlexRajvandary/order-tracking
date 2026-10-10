using OrderTracking.Domain.Common;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Domain.Entities;

public sealed class OrderItemProcurement : AuditableEntity
{
    public Guid OrderItemId { get; set; }
    public string? PurchaseUrl { get; set; }
    public ProcurementLifecycleStatus CurrentStatus { get; set; } = ProcurementLifecycleStatus.RequiredPurchase;
    public decimal? PurchasePrice { get; set; }
    public string PurchaseCurrencyCode { get; set; } = CurrencyCodes.Jpy;
    public string? SellerOrderNumber { get; set; }
    public string? WarehouseTrackingNumber { get; set; }
    public DateOnly? WarehouseReceivedAt { get; set; }
    public WarehouseCondition? WarehouseCondition { get; set; }
    public string? ShippingTrackingNumber { get; set; }
    public string? ShippingMethod { get; set; }
    public decimal? ShippingWeight { get; set; }
    public decimal? ShippingCost { get; set; }
    public string ShippingCurrencyCode { get; set; } = CurrencyCodes.Jpy;
    public DateOnly? ShippedAt { get; set; }

    public OrderItem OrderItem { get; set; } = null!;
    public ICollection<OrderItemProcurementAttachment> Attachments { get; set; } = [];
    public ICollection<OrderItemProcurementStatusHistory> StatusHistory { get; set; } = [];
    public ICollection<OrderItemProcurementError> Errors { get; set; } = [];
}
