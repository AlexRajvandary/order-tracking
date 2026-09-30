using OrderTracking.Domain.Enums;

namespace OrderTracking.Infrastructure.TelegramBot;

internal static class TelegramBotCallback
{
    public const string AdminLink = "link";
    public const string AdminsPagePrefix = "ap:";
    public const string CustomerOpenPrefix = "ci:";
    public const string CustomersPagePrefix = "cp:";
    public const string Main = "m";
    public const string Noop = "noop";
    public const string OrderNotificationBackPrefix = "onb:";
    public const string OrderNotificationActionsPrefix = "ona:";
    public const string OrderNotificationContactPrefix = "onc:";
    public const string OrderNotificationHistoryPrefix = "onh:";
    public const string OrderNotificationOpenPrefix = "ono:";
    public const string OrderActionsPrefix = "oa:";
    public const string OrderContactPrefix = "oc:";
    public const string OrderHistoryPrefix = "oh:";
    public const string OrderOpenPrefix = "oi:";
    public const string OrderSetStatusPrefix = "os:";
    public const string OrderNotificationSetStatusPrefix = "ons:";
    public const string OrderDeletePrefix = "od:";
    public const string OrderDeleteConfirmPrefix = "odc:";
    public const string OrdersPagePrefix = "op:";
    public const string Settings = "set";
    public const string SettingsCsvOff = "set:csv:0";
    public const string SettingsCsvOn = "set:csv:1";

    public static Guid? DecodeGuid(string value)
    {
        try
        {
            var padded = value.Replace('-', '+').Replace('_', '/');
            switch (padded.Length % 4)
            {
                case 2: padded += "=="; break;
                case 3: padded += "="; break;
            }

            var bytes = Convert.FromBase64String(padded);
            return new Guid(bytes);
        }
        catch
        {
            return null;
        }
    }

    public static string EncodeGuid(Guid id)
    {
        var raw = Convert.ToBase64String(id.ToByteArray())
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
        return raw;
    }

    /// <summary>Format: oi:{guid}[:{page}] — page optional for legacy notification buttons.</summary>
    public static string OrderOpen(Guid orderId, int page = 1)
    {
        return WithPage(OrderOpenPrefix, orderId, page);
    }

    public static string OrderNotificationOpen(Guid orderId)
    {
        return WithId(OrderNotificationOpenPrefix, orderId);
    }

    public static string OrderNotificationBack(Guid orderId)
    {
        return WithId(OrderNotificationBackPrefix, orderId);
    }

    public static string OrderActions(Guid orderId, int page)
    {
        return WithPage(OrderActionsPrefix, orderId, page);
    }

    public static string OrderContact(Guid orderId, int page)
    {
        return WithPage(OrderContactPrefix, orderId, page);
    }

    public static string OrderHistory(Guid orderId, int page)
    {
        return WithPage(OrderHistoryPrefix, orderId, page);
    }

    public static string OrderSetStatus(Guid orderId, int page, OrderStatus status, bool notificationContext)
    {
        var prefix = notificationContext ? OrderNotificationSetStatusPrefix : OrderSetStatusPrefix;
        return $"{prefix}{EncodeGuid(orderId)}:{Math.Max(1, page)}:{(int)status}";
    }

    public static string OrderDelete(Guid orderId, int page, bool confirm = false)
    {
        var prefix = confirm ? OrderDeleteConfirmPrefix : OrderDeletePrefix;
        return $"{prefix}{EncodeGuid(orderId)}:{Math.Max(1, page)}";
    }

    public static bool TryParseOrderDelete(string data, out Guid orderId, out int page, out bool confirm)
    {
        confirm = data.StartsWith(OrderDeleteConfirmPrefix, StringComparison.Ordinal);
        var prefix = confirm ? OrderDeleteConfirmPrefix
            : data.StartsWith(OrderDeletePrefix, StringComparison.Ordinal) ? OrderDeletePrefix : null;
        orderId = default;
        page = 1;
        if (prefix is null) return false;
        var parts = data[prefix.Length..].Split(':', StringSplitOptions.None);
        if (parts.Length != 2 || DecodeGuid(parts[0]) is not Guid parsedId
            || !int.TryParse(parts[1], out var parsedPage) || parsedPage < 1) return false;
        orderId = parsedId;
        page = parsedPage;
        return true;
    }

    public static string OrderNotificationActions(Guid orderId)
    {
        return WithId(OrderNotificationActionsPrefix, orderId);
    }

    public static string OrderNotificationContact(Guid orderId)
    {
        return WithId(OrderNotificationContactPrefix, orderId);
    }

    public static string OrderNotificationHistory(Guid orderId)
    {
        return WithId(OrderNotificationHistoryPrefix, orderId);
    }

    /// <summary>Format: ci:{guid}[:{page}]</summary>
    public static string CustomerOpen(Guid customerId, int page = 1)
    {
        return WithPage(CustomerOpenPrefix, customerId, page);
    }

    public static bool TryParseEntityOpen(string payload, out Guid id, out int page)
    {
        id = default;
        page = 1;
        if (string.IsNullOrWhiteSpace(payload))
        {
            return false;
        }

        var parts = payload.Split(':', 2, StringSplitOptions.None);
        var parsed = DecodeGuid(parts[0]);
        if (parsed is null)
        {
            return false;
        }

        id = parsed.Value;
        if (parts.Length > 1 && int.TryParse(parts[1], out var p) && p >= 1)
        {
            page = p;
        }

        return true;
    }

    public static bool TryParseOrderStatus(
        string data,
        out Guid orderId,
        out int page,
        out OrderStatus status,
        out bool notificationContext)
    {
        var prefix = data.StartsWith(OrderNotificationSetStatusPrefix, StringComparison.Ordinal)
            ? OrderNotificationSetStatusPrefix
            : data.StartsWith(OrderSetStatusPrefix, StringComparison.Ordinal)
                ? OrderSetStatusPrefix
                : null;
        notificationContext = prefix == OrderNotificationSetStatusPrefix;
        orderId = default;
        page = 1;
        status = default;
        if (prefix is null)
        {
            return false;
        }

        var parts = data[prefix.Length..].Split(':', StringSplitOptions.None);
        if (parts.Length != 3 || DecodeGuid(parts[0]) is not Guid parsedId
            || !int.TryParse(parts[1], out var parsedPage) || parsedPage < 1
            || !int.TryParse(parts[2], out var parsedStatus)
            || !Enum.IsDefined(typeof(OrderStatus), parsedStatus))
        {
            return false;
        }

        orderId = parsedId;
        page = parsedPage;
        status = (OrderStatus)parsedStatus;
        return true;
    }

    private static string WithId(string prefix, Guid id)
    {
        return prefix + EncodeGuid(id);
    }

    private static string WithPage(string prefix, Guid id, int page)
    {
        return WithId(prefix, id) + ":" + Math.Max(1, page);
    }
}
