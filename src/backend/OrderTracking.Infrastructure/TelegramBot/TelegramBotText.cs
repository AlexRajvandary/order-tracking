namespace OrderTracking.Infrastructure.TelegramBot;

internal static class TelegramBotText
{
    public static string Escape(string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return string.Empty;
        }

        return value
            .Replace("&", "&amp;")
            .Replace("<", "&lt;")
            .Replace(">", "&gt;");
    }

    public static string RoleLabel(Domain.Enums.AdminRole role) => role switch
    {
        Domain.Enums.AdminRole.SuperAdmin => "SuperAdmin",
        Domain.Enums.AdminRole.Admin => "Admin",
        Domain.Enums.AdminRole.Moderator => "Moderator",
        _ => role.ToString(),
    };

    public static string Truncate(string? value, int max)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return "—";
        }

        value = value.Trim();
        return value.Length <= max ? value : value[..(max - 1)] + "…";
    }
}
