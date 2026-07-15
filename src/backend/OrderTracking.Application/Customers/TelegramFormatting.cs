namespace OrderTracking.Application.Customers;

public static class TelegramFormatting
{
    private static readonly string[] ProfileHosts =
        ["t.me", "www.t.me", "telegram.me", "www.telegram.me"];

    public static string? Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.Trim();
        var username = ExtractUsername(trimmed);
        return username is null ? trimmed : $"@{username.TrimStart('@')}";
    }

    private static string? ExtractUsername(string value)
    {
        if (value.StartsWith('@'))
        {
            return CleanUsername(value[1..]);
        }

        if (value.StartsWith("tg://", StringComparison.OrdinalIgnoreCase)
            && Uri.TryCreate(value, UriKind.Absolute, out var telegramUri))
        {
            var domain = ParseQuery(telegramUri.Query, "domain");
            return CleanUsername(domain);
        }

        var candidate = value.Contains("://", StringComparison.Ordinal)
            ? value
            : ProfileHosts.Any(host =>
                value.StartsWith($"{host}/", StringComparison.OrdinalIgnoreCase))
                ? $"https://{value}"
                : null;

        if (candidate is not null
            && Uri.TryCreate(candidate, UriKind.Absolute, out var profileUri)
            && ProfileHosts.Contains(profileUri.Host, StringComparer.OrdinalIgnoreCase))
        {
            return CleanUsername(profileUri.AbsolutePath.Trim('/').Split('/')[0]);
        }

        return CleanUsername(value);
    }

    private static string? CleanUsername(string? value)
    {
        var username = value?.Trim().TrimStart('@').Trim('/');
        if (string.IsNullOrWhiteSpace(username)
            || username.Any(character =>
                !(character is >= 'a' and <= 'z')
                && !(character is >= 'A' and <= 'Z')
                && !char.IsDigit(character)
                && character != '_'))
        {
            return null;
        }

        return username;
    }

    private static string? ParseQuery(string query, string key)
    {
        foreach (var part in query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var pair = part.Split('=', 2);
            if (pair.Length == 2 && pair[0].Equals(key, StringComparison.OrdinalIgnoreCase))
            {
                return Uri.UnescapeDataString(pair[1]);
            }
        }

        return null;
    }
}
