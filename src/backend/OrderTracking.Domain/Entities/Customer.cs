using OrderTracking.Domain.Common;

namespace OrderTracking.Domain.Entities;

public class Customer : AuditableEntity
{
    public string? LastName { get; set; }

    public string? FirstName { get; set; }

    public string? Patronymic { get; set; }

    public string? Telegram { get; set; }

    public string? Phone { get; set; }

    public string? WhatsApp { get; set; }

    public string? Vk { get; set; }

    public string? Email { get; set; }

    public string? Notes { get; set; }

    public ICollection<Order> Orders { get; set; } = [];

    public ICollection<CustomerAddress> Addresses { get; set; } = [];
}
