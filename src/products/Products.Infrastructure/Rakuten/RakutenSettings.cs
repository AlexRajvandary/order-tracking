namespace Products.Infrastructure.Rakuten;

public sealed class RakutenSettings
{
    public const string SectionName = "Rakuten";
    public string ApplicationId { get; set; } = string.Empty;
    public string AccessKey { get; set; } = string.Empty;
    public string AffiliateId { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://openapi.rakuten.co.jp/";
    public int TimeoutSeconds { get; set; } = 10;
    public int SearchCacheSeconds { get; set; } = 300;
    public int ItemCacheSeconds { get; set; } = 120;
}
