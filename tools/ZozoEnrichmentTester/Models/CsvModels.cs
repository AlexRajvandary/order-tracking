using CsvHelper.Configuration.Attributes;

namespace ZozoEnrichmentTester.Models;

public sealed class InputProduct
{
    [Name("id", "product_id")] public string Id { get; set; } = "";
    [Name("url", "source_url")] public string Url { get; set; } = "";
}

public sealed class OutputProduct
{
    [Name("id")] public string Id { get; set; } = "";
    [Name("source_url")] public string SourceUrl { get; set; } = "";
    [Name("name")] public string Name { get; set; } = "";
    [Name("brand")] public string Brand { get; set; } = "";
    [Name("description")] public string Description { get; set; } = "";
    [Name("material")] public string Material { get; set; } = "";
    [Name("price")] public decimal? Price { get; set; }
    [Name("original_price")] public decimal? OriginalPrice { get; set; }
    [Name("currency")] public string Currency { get; set; } = "JPY";
    [Name("photos")] public string Photos { get; set; } = "[]";
    [Name("colors")] public string Colors { get; set; } = "[]";
    [Name("sizes")] public string Sizes { get; set; } = "[]";
    [Name("size_specs")] public string SizeSpecs { get; set; } = "[]";
    [Name("variants")] public string Variants { get; set; } = "[]";
    [Name("availability")] public string Availability { get; set; } = "Unknown";
    [Name("movies")] public string Movies { get; set; } = "[]";
    [Name("goods_id")] public string GoodsId { get; set; } = "";
    [Name("goods_detail_id")] public string GoodsDetailId { get; set; } = "";
    [Name("goods_type_id")] public string GoodsTypeId { get; set; } = "";
    [Name("shop_id")] public string ShopId { get; set; } = "";
    [Name("status")] public string Status { get; set; } = "";
    [Name("error")] public string Error { get; set; } = "";
}

public sealed record ZozoColor(long Id, string Name);
public sealed record ZozoSize(long Id, string Name, string ShortName);
public sealed record ZozoSizeSpecs(string Size, Dictionary<string, string> Specs);
public sealed record ZozoVariant(long? ColorId, string Color, long? SizeId, string Size, bool? Available);
public sealed record ZozoProductResult(OutputProduct Output, bool IsBlocked);
