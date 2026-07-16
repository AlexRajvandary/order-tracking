namespace OrderTracking.Application.Common.Realtime;

/// <summary>
/// Logical realtime topics broadcast to authenticated admin clients so the UI can
/// invalidate the corresponding React Query caches.
/// </summary>
public static class RealtimeTopics
{
    public const string Orders = "orders";
    public const string Customers = "customers";
    public const string Admins = "admins";
    public const string Statuses = "statuses";
    public const string Dashboard = "dashboard";
}
