namespace OrderTracking.Application.Admins;

public static class AdminPresence
{
    /// <summary>Admin is considered online if last heartbeat is within this window.</summary>
    public static readonly TimeSpan OnlineThreshold = TimeSpan.FromMinutes(2);

    public static bool IsOnline(DateTimeOffset? lastSeenAt, DateTimeOffset utcNow) =>
        lastSeenAt is not null && utcNow - lastSeenAt.Value <= OnlineThreshold;
}
