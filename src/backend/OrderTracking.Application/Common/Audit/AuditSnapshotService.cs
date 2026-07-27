using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Customers;

namespace OrderTracking.Application.Common.Audit;

public sealed class AuditSnapshotService : IAuditSnapshotService
{
    private readonly IOrderRepository _orderRepository;
    private readonly ICustomerRepository _customerRepository;
    private readonly IStatusDefinitionRepository _statusDefinitionRepository;

    public AuditSnapshotService(
        IOrderRepository orderRepository,
        ICustomerRepository customerRepository,
        IStatusDefinitionRepository statusDefinitionRepository)
    {
        _orderRepository = orderRepository;
        _customerRepository = customerRepository;
        _statusDefinitionRepository = statusDefinitionRepository;
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
        var order = await _orderRepository.GetAuditSnapshotAsync(
            id,
            includeDeleted,
            cancellationToken);

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
            ["deliveryAddressId"] = order.DeliveryAddressId?.ToString(),
            ["deliveryCity"] = order.DeliveryCity,
            ["deliveryStreet"] = order.DeliveryStreet,
            ["deliveryBuilding"] = order.DeliveryBuilding,
            ["deliveryApartment"] = order.DeliveryApartment,
            ["deliveryPostalCode"] = order.DeliveryPostalCode,
            ["deliveryNote"] = order.DeliveryNote,
            ["isDeleted"] = order.IsDeleted ? "true" : "false",
        };
    }

    private async Task<IReadOnlyDictionary<string, string?>?> CaptureOrderItemAsync(
        Guid itemId,
        bool includeDeleted,
        CancellationToken cancellationToken)
    {
        var item = await _orderRepository.GetItemAuditSnapshotAsync(
            itemId,
            includeDeleted,
            cancellationToken);

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
            ["unitPrice"] = item.UnitPrice?.ToString(System.Globalization.CultureInfo.InvariantCulture),
            ["currencyCode"] = item.CurrencyCode,
            ["currentStatusText"] = item.CurrentStatusText,
            ["isDeleted"] = item.IsDeleted ? "true" : "false",
        };
    }

    private async Task<IReadOnlyDictionary<string, string?>?> CaptureCustomerAsync(
        Guid id,
        bool includeDeleted,
        CancellationToken cancellationToken)
    {
        var customer = await _customerRepository.GetAuditSnapshotAsync(
            id,
            includeDeleted,
            cancellationToken);

        if (customer is null)
        {
            return null;
        }

        return new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
        {
            ["lastName"] = customer.LastName,
            ["firstName"] = customer.FirstName,
            ["patronymic"] = customer.Patronymic,
            ["fullName"] = CustomerNameFormatting.Format(
                customer.LastName,
                customer.FirstName,
                customer.Patronymic),
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
        var status = await _statusDefinitionRepository.GetAuditSnapshotAsync(
            id,
            includeDeleted,
            cancellationToken);

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
