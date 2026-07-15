using OrderTracking.Domain.Common;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Domain.Entities;

public class Order : AuditableEntity
{
    public string TrackingCode { get; set; } = string.Empty;
    public Guid? CustomerId { get; set; }
    public Guid? DeliveryAddressId { get; set; }
    public string? DeliveryCity { get; set; }
    public string? DeliveryStreet { get; set; }
    public string? DeliveryBuilding { get; set; }
    public string? DeliveryApartment { get; set; }
    public string? DeliveryPostalCode { get; set; }
    public string? DeliveryNote { get; set; }
    public string? AdminNotes { get; set; }
    public Guid CreatedByAdminId { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.AwaitingPayment;
    public DateTimeOffset? ExpectedDeliveryAt { get; set; }

    public Customer? Customer { get; set; }
    public CustomerAddress? DeliveryAddress { get; set; }
    public AdminUser CreatedByAdmin { get; set; } = null!;
    public ICollection<OrderItem> Items { get; set; } = [];
}