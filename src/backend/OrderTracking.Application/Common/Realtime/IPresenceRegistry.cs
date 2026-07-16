namespace OrderTracking.Application.Common.Realtime;

/// <summary>
/// In-memory registry that tracks which admins and public-tracking customers are currently connected
/// via realtime transports. Presence transitions are debounced by a grace period before an entity is
/// reported offline. Implemented as a singleton in the API layer.
/// </summary>
public interface IPresenceRegistry
{
    IReadOnlySet<Guid> GetOnlineAdminIds();

    IReadOnlySet<Guid> GetOnlineCustomerIds();

    bool IsAdminOnline(Guid adminId);

    bool IsCustomerOnline(Guid customerId);

    void AdminConnected(Guid adminId, string connectionId);

    void AdminDisconnected(Guid adminId, string connectionId);

    void CustomerConnected(Guid customerId, string connectionId);

    void CustomerDisconnected(Guid customerId, string connectionId);
}
