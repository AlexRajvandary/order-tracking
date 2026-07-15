using System.Globalization;

namespace OrderTracking.Application.Customers;

public static class CustomerNameFormatting
{
    private static readonly CultureInfo Ru = CultureInfo.GetCultureInfo("ru-RU");

    public static string? Format(string? lastName, string? firstName, string? patronymic)
    {
        var parts = new[] { lastName, firstName, patronymic }
            .Where(static p => !string.IsNullOrWhiteSpace(p))
            .Select(static p => p!.Trim());

        var result = string.Join(' ', parts);
        return result.Length == 0 ? null : result;
    }

    public static string? NormalizePart(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.Trim();
        if (trimmed.Length == 0)
        {
            return null;
        }

        return char.ToUpper(trimmed[0], Ru) + trimmed[1..];
    }
}
