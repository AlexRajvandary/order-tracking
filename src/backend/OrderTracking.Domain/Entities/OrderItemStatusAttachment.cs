using OrderTracking.Domain.Common;

namespace OrderTracking.Domain.Entities;

public class OrderItemStatusAttachment : BaseEntity
{
    public Guid StatusHistoryId { get; set; }
    public string ObjectKey { get; set; } = string.Empty;
    public string ContentType { get; set; } = "image/jpeg";
    public string? OriginalFileName { get; set; }
    public long SizeBytes { get; set; }
    public int SortOrder { get; set; }
    public Guid UploadedByAdminId { get; set; }
    public DateTimeOffset UploadedAt { get; set; }

    public OrderItemStatusHistory StatusHistory { get; set; } = null!;
    public AdminUser UploadedByAdmin { get; set; } = null!;
}
