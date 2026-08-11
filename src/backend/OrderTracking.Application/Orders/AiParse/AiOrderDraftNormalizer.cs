using OrderTracking.Domain.Common;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Application.Orders.AiParse;

public static class AiOrderDraftNormalizer
{
    public static AiOrderDraft Normalize(AiOrderDraft draft)
    {
        ArgumentNullException.ThrowIfNull(draft);

        var customer = draft.Customer is null
            ? null
            : new AiOrderCustomerDraft(
                NullIfWhiteSpace(draft.Customer.LastName),
                NullIfWhiteSpace(draft.Customer.FirstName),
                NullIfWhiteSpace(draft.Customer.Patronymic),
                NullIfWhiteSpace(draft.Customer.Telegram),
                NormalizePhone(draft.Customer.Phone),
                NullIfWhiteSpace(draft.Customer.Email));

        var items = (draft.Items ?? Array.Empty<AiOrderItemDraft>())
            .Select(NormalizeItem)
            .Where(i => i is not null)
            .Select(i => i!)
            .ToList();

        var delivery = draft.Delivery is null
            ? null
            : new AiOrderDeliveryDraft(
                NullIfWhiteSpace(draft.Delivery.City),
                NullIfWhiteSpace(draft.Delivery.Street),
                NullIfWhiteSpace(draft.Delivery.Building),
                NullIfWhiteSpace(draft.Delivery.Apartment),
                NullIfWhiteSpace(draft.Delivery.PostalCode),
                NullIfWhiteSpace(draft.Delivery.Note));

        if (delivery is not null && !HasAnyDelivery(delivery))
        {
            delivery = null;
        }

        if (customer is not null && !HasAnyCustomer(customer))
        {
            customer = null;
        }

        var payment = draft.Payment is null
            ? null
            : new AiOrderPaymentDraft(
                draft.Payment.Prepayment is > 0 ? draft.Payment.Prepayment : null,
                CurrencyCodes.Normalize(draft.Payment.CurrencyCode));

        if (payment is { Prepayment: null, CurrencyCode: null })
        {
            payment = null;
        }

        return new AiOrderDraft(
            customer,
            items,
            delivery,
            payment,
            NullIfWhiteSpace(draft.Comment),
            (draft.MissingFields ?? Array.Empty<string>())
                .Select(f => f?.Trim())
                .Where(f => !string.IsNullOrWhiteSpace(f))
                .Cast<string>()
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList(),
            (draft.UncertainFields ?? Array.Empty<AiUncertainField>())
                .Where(u => !string.IsNullOrWhiteSpace(u.Field))
                .Select(u => new AiUncertainField(u.Field.Trim(), NullIfWhiteSpace(u.Reason) ?? "Ambiguous"))
                .ToList());
    }

    private static AiOrderItemDraft? NormalizeItem(AiOrderItemDraft item)
    {
        var name = NullIfWhiteSpace(item.Name);
        var url = NullIfWhiteSpace(item.Url);
        var description = NullIfWhiteSpace(item.Description);

        if (name is null && url is null && description is null)
        {
            return null;
        }

        var itemType = NormalizeItemType(item.ItemType);
        var quantity = item.Quantity is >= 1 and <= 10_000 ? item.Quantity : 1;
        var unitPrice = item.UnitPrice is >= 0 ? item.UnitPrice : null;
        var currency = unitPrice is null ? null : CurrencyCodes.Normalize(item.CurrencyCode);

        return new AiOrderItemDraft(
            itemType,
            name ?? url ?? description,
            url,
            description,
            quantity,
            unitPrice,
            currency);
    }

    private static string NormalizeItemType(string? value)
    {
        if (string.Equals(value, nameof(OrderItemType.Service), StringComparison.OrdinalIgnoreCase))
        {
            return nameof(OrderItemType.Service);
        }

        return nameof(OrderItemType.Product);
    }

    private static string? NormalizePhone(string? phone)
    {
        var value = NullIfWhiteSpace(phone);
        if (value is null)
        {
            return null;
        }

        // Keep digits and leading +. Do not invent a country code.
        var chars = value.Where(c => char.IsDigit(c) || c == '+').ToArray();
        if (chars.Length == 0)
        {
            return value;
        }

        var normalized = new string(chars);
        if (normalized.Count(c => c == '+') > 1 || (normalized.Contains('+') && normalized[0] != '+'))
        {
            return value;
        }

        return normalized;
    }

    private static bool HasAnyCustomer(AiOrderCustomerDraft c) =>
        c.LastName is not null
        || c.FirstName is not null
        || c.Patronymic is not null
        || c.Telegram is not null
        || c.Phone is not null
        || c.Email is not null;

    private static bool HasAnyDelivery(AiOrderDeliveryDraft d) =>
        d.City is not null
        || d.Street is not null
        || d.Building is not null
        || d.Apartment is not null
        || d.PostalCode is not null
        || d.Note is not null;

    private static string? NullIfWhiteSpace(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
