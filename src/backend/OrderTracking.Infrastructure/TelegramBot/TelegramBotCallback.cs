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
    public const string OrderNotificationOpenPrefix = "ono:";
    public const string OrderOpenPrefix = "oi:";
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
    public static string OrderOpen(Guid orderId, int page = 1) =>
        OrderOpenPrefix + EncodeGuid(orderId) + ":" + Math.Max(1, page);

    public static string OrderNotificationOpen(Guid orderId) =>
        OrderNotificationOpenPrefix + EncodeGuid(orderId);

    public static string OrderNotificationBack(Guid orderId) =>
        OrderNotificationBackPrefix + EncodeGuid(orderId);

    /// <summary>Format: ci:{guid}[:{page}]</summary>
    public static string CustomerOpen(Guid customerId, int page = 1) =>
        CustomerOpenPrefix + EncodeGuid(customerId) + ":" + Math.Max(1, page);

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
}
