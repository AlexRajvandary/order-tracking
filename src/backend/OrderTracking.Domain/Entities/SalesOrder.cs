using OrderTracking.Domain.Common;

namespace OrderTracking.Domain.Entities;

/// <summary>A manually accepted request. Its workspace request stores the editable fulfillment details.</summary>
public sealed class SalesOrder : AuditableEntity
{
    public Guid SourceRequestId { get; set; }
    public Guid WorkspaceRequestId { get; set; }

    public Order SourceRequest { get; set; } = null!;
    public Order WorkspaceRequest { get; set; } = null!;
}
