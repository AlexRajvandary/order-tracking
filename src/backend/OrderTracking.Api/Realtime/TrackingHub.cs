using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Realtime;

namespace OrderTracking.Api.Realtime;

/// <summary>
/// Anonymous hub for public order tracking pages. A viewer calls <see cref="Join"/> with the
/// tracking code; the connection is added to a per-order group so it receives <c>trackingChanged</c>
/// events, and (when the order has a customer) the customer is marked online for the duration of the
/// connection.
/// </summary>
public sealed class TrackingHub : Hub
{
    private const string OrderIdKey = "orderId";
    private const string CustomerIdKey = "customerId";

    private readonly IApplicationDbContext _dbContext;
    private readonly IPresenceRegistry _presence;

    public TrackingHub(IApplicationDbContext dbContext, IPresenceRegistry presence)
    {
        _dbContext = dbContext;
        _presence = presence;
    }

    public static string TrackingGroup(Guid orderId) => $"tracking-{orderId}";

    public async Task Join(string trackingCode)
    {
        if (string.IsNullOrWhiteSpace(trackingCode))
        {
            return;
        }

        // Connection may already be gone (React Strict Mode remount race).
        if (Context.ConnectionAborted.IsCancellationRequested)
        {
            return;
        }

        var code = trackingCode.Trim().ToUpperInvariant();

        var order = await _dbContext.Orders
            .AsNoTracking()
            .Where(o => o.TrackingCode == code)
            .Select(o => new { o.Id, o.CustomerId })
            .FirstOrDefaultAsync(Context.ConnectionAborted);

        if (order is null || Context.ConnectionAborted.IsCancellationRequested)
        {
            return;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, TrackingGroup(order.Id), Context.ConnectionAborted);
        Context.Items[OrderIdKey] = order.Id;

        if (order.CustomerId is { } customerId)
        {
            Context.Items[CustomerIdKey] = customerId;
            _presence.CustomerConnected(customerId, Context.ConnectionId);

            // Join raced with disconnect (e.g. React Strict Mode remount): undo the ghost connection.
            if (Context.ConnectionAborted.IsCancellationRequested)
            {
                _presence.CustomerDisconnected(customerId, Context.ConnectionId);
            }
        }
    }

    public override Task OnDisconnectedAsync(Exception? exception)
    {
        if (Context.Items.TryGetValue(CustomerIdKey, out var value) && value is Guid customerId)
        {
            _presence.CustomerDisconnected(customerId, Context.ConnectionId);
        }

        return base.OnDisconnectedAsync(exception);
    }
}
