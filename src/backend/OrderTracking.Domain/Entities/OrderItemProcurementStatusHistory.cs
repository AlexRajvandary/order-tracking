using OrderTracking.Domain.Common;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Domain.Entities;

public sealed class OrderItemProcurementStatusHistory : BaseEntity
{
    public Guid ProcurementId { get; set; }
    public ProcurementLifecycleStatus? PreviousStatus { get; set; }
    public ProcurementLifecycleStatus Status { get; set; }
    public DateTimeOffset ChangedAt { get; set; }
    public Guid? ChangedByAdminId { get; set; }
    public string? Comment { get; set; }
    public OrderItemProcurement Procurement { get; set; } = null!;
}
