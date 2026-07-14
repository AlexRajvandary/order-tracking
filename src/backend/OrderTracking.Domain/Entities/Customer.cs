using OrderTracking.Domain.Common;

namespace OrderTracking.Domain.Entities;

public class Customer : AuditableEntity
{
    public string? FullName { get; set; }
    public string? Telegram { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Notes { get; set; }

    public ICollection<Order> Orders { get; set; } = [];
}
