namespace OrderTracking.Application.Common.Realtime;

/// <summary>
/// Pushes realtime notifications to connected clients. Implemented in the API layer on top of SignalR.
/// Implementations must never throw into the caller: realtime delivery is best-effort.
/// </summary>
public interface IRealtimeNotifier
{
    /// <summary>Notify all connected admins that data behind the given topics changed.</summary>
    Task NotifyAdminTopicsAsync(IReadOnlyCollection<string> topics, CancellationToken cancellationToken = default);

    /// <summary>Notify public tracking viewers of a specific order that its data changed.</summary>
    Task NotifyTrackingChangedAsync(Guid orderId, CancellationToken cancellationToken = default);
}
