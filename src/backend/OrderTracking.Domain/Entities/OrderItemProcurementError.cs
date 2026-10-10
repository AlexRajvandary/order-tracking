using OrderTracking.Domain.Common;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Domain.Entities;

public sealed class OrderItemProcurementError : BaseEntity
{
    public Guid ProcurementId { get; set; }
    public string Text { get; set; } = string.Empty;
    public ProcurementLifecycleStatus StatusAtCreation { get; set; }
    public string StageAtCreation { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
    public Guid? AuthorId { get; set; }
    public bool IsBlocking { get; set; } = true;
    public bool IsResolved { get; set; }
    public DateTimeOffset? ResolvedAt { get; set; }
    public Guid? ResolvedByAdminId { get; set; }
    public OrderItemProcurement Procurement { get; set; } = null!;
}
