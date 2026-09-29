using OrderTracking.Domain.Common;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Domain.Entities;

public sealed class OrderItemProcurementAttachment : BaseEntity
{
    public Guid ProcurementId { get; set; }
    public ProcurementAttachmentKind Kind { get; set; }
    public string ObjectKey { get; set; } = string.Empty;
    public string ContentType { get; set; } = "application/octet-stream";
    public string? OriginalFileName { get; set; }
    public long SizeBytes { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public OrderItemProcurement Procurement { get; set; } = null!;
}
