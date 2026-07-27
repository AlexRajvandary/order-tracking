namespace OrderTracking.Infrastructure.TelegramBot;

internal static class TelegramBotCallback
{
    public const string AdminLink = "link";
    public const string AdminsPagePrefix = "ap:";
    public const string CustomerOpenPrefix = "ci:";
    public const string CustomersPagePrefix = "cp:";
    public const string Main = "m";
    public const string Noop = "noop";
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
}
