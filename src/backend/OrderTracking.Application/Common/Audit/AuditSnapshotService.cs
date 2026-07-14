using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;

namespace OrderTracking.Application.Common.Audit;

public interface IAuditSnapshotService
{
    Task<IReadOnlyDictionary<string, string?>?> CaptureAsync(
        object request,
        string entityType,
        bool includeDeleted,
        CancellationToken cancellationToken = default);
}

public sealed class AuditSnapshotService : IAuditSnapshotService
{
    private readonly IApplicationDbContext _context;

    public AuditSnapshotService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyDictionary<string, string?>?> CaptureAsync(
        object request,
        string entityType,
        bool includeDeleted,
        CancellationToken cancellationToken = default)
    {
        var itemId = GetGuid(request, "ItemId");
        if (itemId is null && LooksLikeOrderItem(request))
        {
            itemId = GetGuid(request, "Id");
        }

        if (itemId is not null)
        {
            return await CaptureOrderItemAsync(itemId.Value, includeDeleted, cancellationToken);
        }

        var id = GetGuid(request, "Id") ?? GetGuid(request, "OrderId") ?? GetGuid(request, "CustomerId");
        if (id is null)
        {
            return null;
        }

        return entityType switch
        {
            "Order" => await CaptureOrderAsync(id.Value, includeDeleted, cancellationToken),
            "Customer" => await CaptureCustomerAsync(id.Value, includeDeleted, cancellationToken),
            "StatusDefinition" => await CaptureStatusAsync(id.Value, includeDeleted, cancellationToken),
            _ => null,
        };
    }

    private static bool LooksLikeOrderItem(object target)
    {
        var type = target.GetType();
        return type.GetProperty("ItemType") is not null
               && type.GetProperty("Name") is not null
               && type.GetProperty("TrackingCode") is null
               && type.GetProperty("Status") is null;
    }

    private async Task<IReadOnlyDictionary<string, string?>?> CaptureOrderAsync(
        Guid id,
        bool includeDeleted,
        CancellationToken cancellationToken)
    {
        var query = _context.Orders.AsNoTracking();
        if (includeDeleted)
        {
            query = query.IgnoreQueryFilters();
        }

        var order = await query
            .Where(o => o.Id == id)
            .Select(o => new
            {
                o.TrackingCode,
                o.CustomerId,
                o.AdminNotes,
                Status = o.Status.ToString(),
                o.ExpectedDeliveryAt,
                o.IsDeleted,
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (order is null)
        {
            return null;
        }

        return new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
        {
            ["trackingCode"] = order.TrackingCode,
            ["customerId"] = order.CustomerId?.ToString(),
            ["adminNotes"] = order.AdminNotes,
            ["status"] = order.Status,
            ["expectedDeliveryAt"] = order.ExpectedDeliveryAt?.ToString("O"),
            ["isDeleted"] = order.IsDeleted ? "true" : "false",
        };
    }

    private async Task<IReadOnlyDictionary<string, string?>?> CaptureOrderItemAsync(
        Guid itemId,
        bool includeDeleted,
        CancellationToken cancellationToken)
    {
        var query = _context.OrderItems.AsNoTracking();
        if (includeDeleted)
        {
            query = query.IgnoreQueryFilters();
        }

        var item = await query
            .Where(i => i.Id == itemId)
            .Select(i => new
            {
                i.Name,
                ItemType = i.ItemType.ToString(),
                i.Description,
                i.Quantity,
                i.CurrentStatusText,
                i.IsDeleted,
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (item is null)
        {
            return null;
        }

        return new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
        {
            ["name"] = item.Name,
            ["itemType"] = item.ItemType,
            ["description"] = item.Description,
            ["quantity"] = item.Quantity.ToString(),
            ["currentStatusText"] = item.CurrentStatusText,
            ["isDeleted"] = item.IsDeleted ? "true" : "false",
        };
    }

    private async Task<IReadOnlyDictionary<string, string?>?> CaptureCustomerAsync(
        Guid id,
        bool includeDeleted,
        CancellationToken cancellationToken)
    {
        var query = _context.Customers.AsNoTracking();
        if (includeDeleted)
        {
            query = query.IgnoreQueryFilters();
        }

        var customer = await query
            .Where(c => c.Id == id)
            .Select(c => new
            {
                c.FullName,
                c.Telegram,
                c.Phone,
                c.Email,
                c.Notes,
                c.IsDeleted,
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (customer is null)
        {
            return null;
        }

        return new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
        {
            ["fullName"] = customer.FullName,
            ["telegram"] = customer.Telegram,
            ["phone"] = customer.Phone,
            ["email"] = customer.Email,
            ["notes"] = customer.Notes,
            ["isDeleted"] = customer.IsDeleted ? "true" : "false",
        };
    }

    private async Task<IReadOnlyDictionary<string, string?>?> CaptureStatusAsync(
        Guid id,
        bool includeDeleted,
        CancellationToken cancellationToken)
    {
        var query = _context.StatusDefinitions.AsNoTracking();
        if (includeDeleted)
        {
            query = query.IgnoreQueryFilters();
        }

        var status = await query
            .Where(s => s.Id == id)
            .Select(s => new
            {
                s.Name,
                ItemType = s.ItemType.HasValue ? s.ItemType.Value.ToString() : null,
                s.Color,
                s.IsActive,
                s.IsFinal,
                s.IsDeleted,
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (status is null)
        {
            return null;
        }

        return new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
        {
            ["name"] = status.Name,
            ["itemType"] = status.ItemType,
            ["color"] = status.Color,
            ["isActive"] = status.IsActive ? "true" : "false",
            ["isFinal"] = status.IsFinal ? "true" : "false",
            ["isDeleted"] = status.IsDeleted ? "true" : "false",
        };
    }

    private static Guid? GetGuid(object target, string propertyName)
    {
        var property = target.GetType().GetProperty(propertyName);
        if (property is null)
        {
            return null;
        }

        var value = property.GetValue(target);
        return value is Guid guid && guid != Guid.Empty ? guid : null;
    }
}
