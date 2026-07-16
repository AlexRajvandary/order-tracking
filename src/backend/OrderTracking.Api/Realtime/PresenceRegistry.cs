using Microsoft.AspNetCore.SignalR;
using OrderTracking.Application.Common.Realtime;

namespace OrderTracking.Api.Realtime;

/// <summary>
/// Thread-safe in-memory presence tracker keyed by SignalR connection id. Duplicate Join calls on
/// the same connection are ignored. When the last connection drops, the entity is reported offline
/// only after a grace period, which absorbs page reloads and brief network blips.
/// </summary>
public sealed class PresenceRegistry : IPresenceRegistry
{
    /// <summary>Brief window so a tab reload does not flicker the admin offline.</summary>
    private static readonly TimeSpan AdminOfflineGrace = TimeSpan.FromSeconds(10);

    /// <summary>Longer window for public tracking viewers (page reloads / mobile network blips).</summary>
    private static readonly TimeSpan CustomerOfflineGrace = TimeSpan.FromSeconds(30);

    private readonly object _gate = new();
    private readonly Dictionary<Guid, Entry> _admins = new();
    private readonly Dictionary<Guid, Entry> _customers = new();
    private readonly IHubContext<AdminHub> _adminHub;
    private readonly ILogger<PresenceRegistry> _logger;

    public PresenceRegistry(IHubContext<AdminHub> adminHub, ILogger<PresenceRegistry> logger)
    {
        _adminHub = adminHub;
        _logger = logger;
    }

    public IReadOnlySet<Guid> GetOnlineAdminIds() => SnapshotOnline(_admins);

    public IReadOnlySet<Guid> GetOnlineCustomerIds() => SnapshotOnline(_customers);

    public bool IsAdminOnline(Guid adminId) => IsOnline(_admins, adminId);

    public bool IsCustomerOnline(Guid customerId) => IsOnline(_customers, customerId);

    public void AdminConnected(Guid adminId, string connectionId) =>
        Connected(_admins, adminId, connectionId, isAdmin: true);

    public void AdminDisconnected(Guid adminId, string connectionId) =>
        Disconnected(_admins, adminId, connectionId, isAdmin: true);

    public void CustomerConnected(Guid customerId, string connectionId) =>
        Connected(_customers, customerId, connectionId, isAdmin: false);

    public void CustomerDisconnected(Guid customerId, string connectionId) =>
        Disconnected(_customers, customerId, connectionId, isAdmin: false);

    private void Connected(Dictionary<Guid, Entry> map, Guid id, string connectionId, bool isAdmin)
    {
        if (string.IsNullOrEmpty(connectionId))
        {
            return;
        }

        var becameOnline = false;
        lock (_gate)
        {
            if (!map.TryGetValue(id, out var entry))
            {
                entry = new Entry();
                map[id] = entry;
            }

            // Same connection re-joined (e.g. TrackingHub.Join called twice) — do not inflate count.
            if (!entry.ConnectionIds.Add(connectionId))
            {
                return;
            }

            entry.PendingOffline?.Cancel();
            entry.PendingOffline = null;

            if (!entry.Online)
            {
                entry.Online = true;
                becameOnline = true;
            }
        }

        if (becameOnline)
        {
            Broadcast(id, isAdmin, isOnline: true);
        }
    }

    private void Disconnected(Dictionary<Guid, Entry> map, Guid id, string connectionId, bool isAdmin)
    {
        if (string.IsNullOrEmpty(connectionId))
        {
            return;
        }

        lock (_gate)
        {
            if (!map.TryGetValue(id, out var entry))
            {
                return;
            }

            if (!entry.ConnectionIds.Remove(connectionId))
            {
                return;
            }

            if (entry.ConnectionIds.Count > 0)
            {
                return;
            }

            entry.PendingOffline?.Cancel();
            var cts = new CancellationTokenSource();
            entry.PendingOffline = cts;
            var grace = isAdmin ? AdminOfflineGrace : CustomerOfflineGrace;
            _ = ScheduleOfflineAsync(map, id, isAdmin, grace, cts.Token);
        }
    }

    private async Task ScheduleOfflineAsync(
        Dictionary<Guid, Entry> map,
        Guid id,
        bool isAdmin,
        TimeSpan grace,
        CancellationToken token)
    {
        try
        {
            await Task.Delay(grace, token);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        var wentOffline = false;
        lock (_gate)
        {
            if (map.TryGetValue(id, out var entry)
                && entry.ConnectionIds.Count == 0
                && entry.Online)
            {
                entry.Online = false;
                entry.PendingOffline = null;
                map.Remove(id);
                wentOffline = true;
            }
        }

        if (wentOffline)
        {
            Broadcast(id, isAdmin, isOnline: false);
        }
    }

    private void Broadcast(Guid id, bool isAdmin, bool isOnline)
    {
        var method = isAdmin ? "adminPresenceChanged" : "clientPresenceChanged";
        var payload = isAdmin
            ? (object)new { adminId = id, isOnline }
            : new { customerId = id, isOnline };

        _ = _adminHub.Clients.All.SendAsync(method, payload)
            .ContinueWith(
                t => _logger.LogWarning(t.Exception, "Failed to broadcast presence change"),
                TaskContinuationOptions.OnlyOnFaulted);
    }

    private IReadOnlySet<Guid> SnapshotOnline(Dictionary<Guid, Entry> map)
    {
        lock (_gate)
        {
            return map.Where(kvp => kvp.Value.Online).Select(kvp => kvp.Key).ToHashSet();
        }
    }

    private bool IsOnline(Dictionary<Guid, Entry> map, Guid id)
    {
        lock (_gate)
        {
            return map.TryGetValue(id, out var entry) && entry.Online;
        }
    }

    private sealed class Entry
    {
        public HashSet<string> ConnectionIds { get; } = new(StringComparer.Ordinal);
        public bool Online;
        public CancellationTokenSource? PendingOffline;
    }
}
