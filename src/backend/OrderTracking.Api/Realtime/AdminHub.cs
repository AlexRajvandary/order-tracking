using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using OrderTracking.Application.Common.Realtime;

namespace OrderTracking.Api.Realtime;

/// <summary>
/// Authenticated hub for admin dashboard clients. Connection lifetime drives admin presence.
/// The server pushes <c>topicsChanged</c>, <c>adminPresenceChanged</c> and
/// <c>clientPresenceChanged</c> events to connected clients.
/// </summary>
[Authorize]
public sealed class AdminHub : Hub
{
    private readonly IPresenceRegistry _presence;

    public AdminHub(IPresenceRegistry presence)
    {
        _presence = presence;
    }

    public override Task OnConnectedAsync()
    {
        if (TryGetUserId(out var userId))
        {
            _presence.AdminConnected(userId, Context.ConnectionId);
        }

        return base.OnConnectedAsync();
    }

    public override Task OnDisconnectedAsync(Exception? exception)
    {
        if (TryGetUserId(out var userId))
        {
            _presence.AdminDisconnected(userId, Context.ConnectionId);
        }

        return base.OnDisconnectedAsync(exception);
    }

    private bool TryGetUserId(out Guid userId)
    {
        var value = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? Context.User?.FindFirstValue("sub")
            ?? Context.UserIdentifier;

        return Guid.TryParse(value, out userId);
    }
}
