using OrderTracking.Domain.Common;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Domain.Entities;

public class Order : AuditableEntity
{
    public string TrackingCode { get; set; } = string.Empty;
    public Guid? CustomerId { get; set; }
    public string? AdminNotes { get; set; }
    public Guid CreatedByAdminId { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.AwaitingPayment;
    public DateTimeOffset? ExpectedDeliveryAt { get; set; }

    public Customer? Customer { get; set; }
    public AdminUser CreatedByAdmin { get; set; } = null!;
    public ICollection<OrderItem> Items { get; set; } = [];
}