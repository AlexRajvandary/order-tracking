namespace OrderTracking.Infrastructure.Monitoring;

public sealed class FornexSettings
{
    public const string SectionName = "Fornex";

    public string BaseUrl { get; set; } = "https://fornex.com/api/";
    public string ApiKey { get; set; } = string.Empty;
    public string OrderId { get; set; } = string.Empty;
}
