using OrderTracking.Domain.Common;

namespace OrderTracking.Domain.Entities;

public class CustomerAddress : AuditableEntity
{
    public Guid? CustomerId { get; set; }
    public string? City { get; set; }
    public string? Street { get; set; }
    public string? Building { get; set; }
    public string? Apartment { get; set; }
    public string? PostalCode { get; set; }
    public string? Note { get; set; }

    public Customer? Customer { get; set; }
    public ICollection<Order> Orders { get; set; } = [];
}
