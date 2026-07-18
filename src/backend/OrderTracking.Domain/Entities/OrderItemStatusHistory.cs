using OrderTracking.Domain.Common;

namespace OrderTracking.Domain.Entities;

public class OrderItemStatusHistory : BaseEntity, ISoftDeletable
{
    public Guid OrderItemId { get; set; }
    public Guid? StatusDefinitionId { get; set; }
    public string StatusText { get; set; } = string.Empty;
    public string? Comment { get; set; }
    public string? Country { get; set; }
    public string? Location { get; set; }
    public DateTimeOffset? PublishAt { get; set; }
    public bool IsPublished { get; set; } = true;
    public Guid ChangedByAdminId { get; set; }
    public DateTimeOffset ChangedAt { get; set; }
    public bool IsDeleted { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }

    public OrderItem OrderItem { get; set; } = null!;
    public StatusDefinition? StatusDefinition { get; set; }
    public AdminUser ChangedByAdmin { get; set; } = null!;
    public ICollection<OrderItemStatusAttachment> Attachments { get; set; } = [];
}
