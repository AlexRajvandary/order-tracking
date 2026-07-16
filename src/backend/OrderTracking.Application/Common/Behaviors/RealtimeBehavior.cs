using MediatR;
using Microsoft.Extensions.Logging;
using OrderTracking.Application.Common.Realtime;

namespace OrderTracking.Application.Common.Behaviors;

/// <summary>
/// After a command completes successfully, broadcasts coarse-grained realtime notifications so
/// connected admin UIs and public tracking viewers can refresh without a manual reload.
/// Mapping is derived from the command namespace to avoid touching every handler. Delivery is
/// best-effort and never affects the command result.
/// </summary>
public sealed class RealtimeBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly IRealtimeNotifier _notifier;
    private readonly ILogger<RealtimeBehavior<TRequest, TResponse>> _logger;

    public RealtimeBehavior(
        IRealtimeNotifier notifier,
        ILogger<RealtimeBehavior<TRequest, TResponse>> logger)
    {
        _notifier = notifier;
        _logger = logger;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        var response = await next(cancellationToken);

        // Only commands mutate state. Queries never trigger realtime updates.
        if (!typeof(TRequest).Name.EndsWith("Command", StringComparison.Ordinal))
        {
            return response;
        }

        var ns = typeof(TRequest).Namespace ?? string.Empty;
        var (topics, isOrder) = ResolveTopics(ns);
        if (topics.Length == 0)
        {
            return response;
        }

        try
        {
            await _notifier.NotifyAdminTopicsAsync(topics, cancellationToken);

            if (isOrder)
            {
                var orderId = TryGetGuid(request, "OrderId", "Id") ?? TryGetGuid(response, "Id", "OrderId");
                if (orderId is { } id && id != Guid.Empty)
                {
                    await _notifier.NotifyTrackingChangedAsync(id, cancellationToken);
                }
            }
        }
        catch (Exception ex)
        {
            // Realtime is best-effort; clients fall back to polling/refetch on focus.
            _logger.LogWarning(ex, "Failed to publish realtime notification for {Command}", typeof(TRequest).Name);
        }

        return response;
    }

    private static (string[] Topics, bool IsOrder) ResolveTopics(string ns)
    {
        if (ns.Contains(".Orders.", StringComparison.Ordinal))
        {
            return ([RealtimeTopics.Orders, RealtimeTopics.Dashboard, RealtimeTopics.Customers], true);
        }

        if (ns.Contains(".Customers.", StringComparison.Ordinal))
        {
            return ([RealtimeTopics.Customers, RealtimeTopics.Dashboard], false);
        }

        if (ns.Contains(".Statuses.", StringComparison.Ordinal))
        {
            return ([RealtimeTopics.Statuses, RealtimeTopics.Orders], false);
        }

        if (ns.Contains(".Admins.", StringComparison.Ordinal))
        {
            return ([RealtimeTopics.Admins, RealtimeTopics.Dashboard], false);
        }

        // Identity (login/heartbeat/password/settings) and everything else: no broadcast.
        return ([], false);
    }

    private static Guid? TryGetGuid(object? target, params string[] propertyNames)
    {
        if (target is null)
        {
            return null;
        }

        var type = target.GetType();
        foreach (var name in propertyNames)
        {
            var property = type.GetProperty(name);
            if (property?.GetValue(target) is Guid guid && guid != Guid.Empty)
            {
                return guid;
            }
        }

        return null;
    }
}
