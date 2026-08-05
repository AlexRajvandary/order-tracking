using Products.Domain.Common;

namespace Products.Domain.Entities;

public class ProductAuditLog : BaseEntity
{
    public Guid ProductId { get; set; }
    public string Action { get; set; } = string.Empty;
    public Guid? ActorAdminId { get; set; }
    public string? ActorLogin { get; set; }
    public string? OldValues { get; set; }
    public string? NewValues { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
