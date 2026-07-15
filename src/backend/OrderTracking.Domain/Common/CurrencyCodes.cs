namespace OrderTracking.Domain.Common;

public static class CurrencyCodes
{
    public const string Rub = "RUB";
    public const string Usd = "USD";
    public const string Eur = "EUR";
    public const string Gbp = "GBP";
    public const string Jpy = "JPY";

    public static bool IsSupported(string? value) =>
        value?.Trim().ToUpperInvariant() is Rub or Usd or Eur or Gbp or Jpy;

    public static string? Normalize(string? value) =>
        IsSupported(value) ? value!.Trim().ToUpperInvariant() : null;
}
