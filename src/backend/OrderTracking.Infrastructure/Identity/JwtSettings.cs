namespace OrderTracking.Infrastructure.Identity;

public sealed class JwtSettings
{
    public const string SectionName = "Jwt";

    public string Secret { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public int AccessExpiryHours { get; set; } = 24;
    public int RefreshExpiryDays { get; set; } = 7;
}
