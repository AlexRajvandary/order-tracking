using Microsoft.AspNetCore.SignalR;
using OrderTracking.Application.Common.Realtime;

namespace OrderTracking.Api.Realtime;

/// <summary>SignalR-backed implementation of <see cref="IRealtimeNotifier"/>.</summary>
public sealed class SignalRRealtimeNotifier : IRealtimeNotifier
{
    private readonly IHubContext<AdminHub> _adminHub;
    private readonly IHubContext<TrackingHub> _trackingHub;

    public SignalRRealtimeNotifier(IHubContext<AdminHub> adminHub, IHubContext<TrackingHub> trackingHub)
    {
        _adminHub = adminHub;
        _trackingHub = trackingHub;
    }

    public Task NotifyAdminTopicsAsync(IReadOnlyCollection<string> topics, CancellationToken cancellationToken = default) =>
        _adminHub.Clients.All.SendAsync("topicsChanged", topics, cancellationToken);

    public Task NotifyTrackingChangedAsync(Guid orderId, CancellationToken cancellationToken = default) =>
        _trackingHub.Clients.Group(TrackingHub.TrackingGroup(orderId)).SendAsync("trackingChanged", cancellationToken);
}
