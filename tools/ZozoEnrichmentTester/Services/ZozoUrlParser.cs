using System.Web;

namespace ZozoEnrichmentTester.Services;

public sealed record ZozoUrlParts(string GoodsId, string GoodsDetailId);

public static class ZozoUrlParser
{
    public static ZozoUrlParts Parse(string value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) || !uri.Host.EndsWith("zozo.jp", StringComparison.OrdinalIgnoreCase))
            throw new FormatException("URL must be an absolute zozo.jp URL.");

        var segments = uri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);
        var marker = Array.FindIndex(segments, segment => segment.Equals("goods", StringComparison.OrdinalIgnoreCase)
            || segment.Equals("goods-sale", StringComparison.OrdinalIgnoreCase));
        if (marker < 0 || marker + 1 >= segments.Length || string.IsNullOrWhiteSpace(segments[marker + 1]))
            throw new FormatException("Could not find goods ID in /goods/ or /goods-sale/ URL.");

        var detailId = HttpUtility.ParseQueryString(uri.Query)["did"];
        if (string.IsNullOrWhiteSpace(detailId))
            throw new FormatException("Could not find goods detail ID in the did query parameter.");

        return new ZozoUrlParts(segments[marker + 1], detailId);
    }
}
