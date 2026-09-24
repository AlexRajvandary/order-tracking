using System.Text.Json;
using System.Text.RegularExpressions;
using AngleSharp;
using AngleSharp.Dom;
using ZozoEnrichmentTester.Configuration;
using ZozoEnrichmentTester.Models;

namespace ZozoEnrichmentTester.Services;

public sealed class ZozoProductParser(ZozoBrowserClient browser, bool saveFailedHtml = false)
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public async Task<ZozoProductResult> ParseAsync(InputProduct input, CancellationToken cancellationToken)
    {
        var output = new OutputProduct { Id = input.Id.Trim(), SourceUrl = input.Url.Trim() };
        string? diagnosticHtml = null;
        try
        {
            var url = ZozoUrlParser.Parse(input.Url);
            output.GoodsId = url.GoodsId;
            output.GoodsDetailId = url.GoodsDetailId;
            Console.WriteLine($"  GoodsId: {url.GoodsId}");
            Console.WriteLine($"  GoodsDetailId: {url.GoodsDetailId}");

            var page = await browser.NavigateProductPageAsync(input.Url, cancellationToken);
            diagnosticHtml = page.Html;
            Console.WriteLine($"  Navigation: HTTP {page.Status?.ToString() ?? "n/a"}, title={page.Title}, final={page.FinalUrl}, {page.Html.Length} chars");
            if (page.IsBlocked)
            {
                await SaveFailedHtmlAsync(input.Id, page.Html, cancellationToken);
                return Blocked(output);
            }
            if (page.Status is < 200 or >= 400)
            {
                await SaveFailedHtmlAsync(input.Id, page.Html, cancellationToken);
                return Failed(output, $"HTTP {page.Status}");
            }

            var nextData = page.NextData ?? await ExtractNextDataAsync(page.Html, cancellationToken);
            Console.WriteLine($"  NEXT_DATA: {(string.IsNullOrWhiteSpace(nextData) ? "not found" : "found")}");
            if (!string.IsNullOrWhiteSpace(nextData)) PopulateFromNextData(output, nextData);
            var ldJsonFound = await PopulateFromLdJsonAsync(output, page.Html, cancellationToken);
            Console.WriteLine($"  Product LD+JSON: {(ldJsonFound ? "found" : "not found")}");
            var embeddedJsonFound = string.IsNullOrWhiteSpace(nextData)
                && await PopulateFromEmbeddedJsonAsync(output, page.Html, cancellationToken);
            var domFound = await PopulateFromDomAsync(output, page.Html, cancellationToken);
            if (string.IsNullOrWhiteSpace(nextData) && !ldJsonFound && !embeddedJsonFound && !domFound)
            {
                await SaveFailedHtmlAsync(input.Id, page.Html, cancellationToken);
                return Failed(output, "No usable product data was found in __NEXT_DATA__, embedded JSON, LD+JSON, or DOM");
            }
            output.GoodsId = EmptyFallback(output.GoodsId, url.GoodsId);
            output.GoodsDetailId = EmptyFallback(output.GoodsDetailId, url.GoodsDetailId);
            Console.WriteLine($"  GoodsTypeId: {Display(output.GoodsTypeId)}");
            Console.WriteLine($"  ShopId: {Display(output.ShopId)}");

            var errors = new List<string>();
            if (AllPresent(output.GoodsId, output.GoodsDetailId, output.GoodsTypeId, output.ShopId))
            {
                var visualUrl = $"/apis/bff/v2/browser/goods/main-visual?device=pc&goods_id={Uri.EscapeDataString(output.GoodsId)}&goods_detail_id={Uri.EscapeDataString(output.GoodsDetailId)}&goods_type_id={Uri.EscapeDataString(output.GoodsTypeId)}&shop_id={Uri.EscapeDataString(output.ShopId)}&include_movie=true";
                var visualResult = await browser.FetchJsonAsync(visualUrl, cancellationToken);
                Console.WriteLine($"  MainVisual: HTTP {visualResult.Status}");
                if (visualResult.IsBlocked) return Blocked(output);
                if (visualResult.Status is >= 200 and < 300) PopulateVisual(output, visualResult.Text);
                else errors.Add(visualResult.Status == 0
                    ? $"main-visual: {CleanError(visualResult.Text)}"
                    : $"main-visual HTTP {visualResult.Status}");
            }
            else errors.Add("main-visual IDs are incomplete");

            var sizeResult = await browser.FetchJsonAsync($"/apis/bff/v2/browser/goods/{Uri.EscapeDataString(output.GoodsId)}/goods-sizes", cancellationToken);
            Console.WriteLine($"  GoodsSizes: HTTP {sizeResult.Status}");
            if (sizeResult.IsBlocked) return Blocked(output);
            if (sizeResult.Status is >= 200 and < 300) PopulateSizes(output, sizeResult.Text);
            else errors.Add(sizeResult.Status == 0
                ? $"goods-sizes: {CleanError(sizeResult.Text)}"
                : $"goods-sizes HTTP {sizeResult.Status}");

            output.Error = string.Join("; ", errors);
            return new ZozoProductResult(output, false);
        }
        catch (OperationCanceledException) { throw; }
        catch (CdpConnectionException) { throw; }
        catch (Exception exception)
        {
            output.Error = CleanError(exception.Message);
            if (diagnosticHtml is not null) await SaveFailedHtmlAsync(input.Id, diagnosticHtml, CancellationToken.None);
            return new ZozoProductResult(output, false);
        }
    }

    private static async Task<string?> ExtractNextDataAsync(string html, CancellationToken cancellationToken)
    {
        var context = BrowsingContext.New(global::AngleSharp.Configuration.Default);
        var document = await context.OpenAsync(request => request.Content(html), cancellationToken);
        return document.QuerySelector("script#__NEXT_DATA__")?.TextContent;
    }

    private static void PopulateFromNextData(OutputProduct output, string json)
    {
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;
        var front = TryPath(root, "props", "pageProps", "frontServerResult") ?? FindObjectWithProperty(root, "goodsName") ?? root;
        var goods = TryProperty(front, "goods") ?? FindObjectWithProperty(front, "goodsName") ?? front;

        output.GoodsId = FirstString(goods, "goodsId", "goods_id") ?? output.GoodsId;
        output.GoodsDetailId = FirstString(goods, "goodsDetailId", "goods_detail_id") ?? output.GoodsDetailId;
        output.GoodsTypeId = FirstString(goods, "goodsTypeId", "goods_type_id", "typeSubCategoryId")
            ?? FindFirstStringRecursive(front, "goodsTypeId", "goods_type_id")
            ?? FindNestedIdRecursive(front, "goodsType", "goods_type")
            ?? FindFirstStringRecursive(root, "goodsTypeId", "goods_type_id")
            ?? "";
        output.ShopId = FirstString(goods, "shopId", "shop_id")
            ?? FindFirstStringRecursive(front, "shopId", "shop_id")
            ?? FindNestedIdRecursive(front, "shop")
            ?? FindFirstStringRecursive(root, "shopId", "shop_id")
            ?? "";
        output.Name = Trim(FirstString(goods, "goodsName", "name"));
        output.Description = ToPlainText(FirstString(goods, "goodsNote", "description"));
        output.Material = ToPlainText(FirstString(goods, "goodsMaterial", "material"));
        output.Brand = Trim(FindNamedValue(goods, "brand", "brandName", "brand_name")
            ?? FindFirstStringRecursive(front, "brandName", "brand_name")
            ?? FindNestedNameRecursive(front, "brand"));
        var priceInfo = TryProperty(goods, "priceInfo");
        output.Price = FirstDecimal(goods, "currentPrice", "sellingPrice", "price", "taxPrice")
            ?? (priceInfo is not null ? FirstDecimal(priceInfo.Value, "currentPrice", "sellingPrice", "salePrice", "discountPrice", "price", "taxPrice") : null);
        output.OriginalPrice = FirstDecimal(goods, "originalPrice", "regularPrice", "properPrice", "listPrice")
            ?? (priceInfo is not null ? FirstDecimal(priceInfo.Value, "originalPrice", "regularPrice", "properPrice", "listPrice") : null)
            ?? (priceInfo is not null && TryProperty(priceInfo.Value, "doublePriceLabel") is { } doublePriceLabel
                ? FirstDecimal(doublePriceLabel, "price")
                : null);
        output.Availability = NormalizeAvailability(
            FirstString(goods, "availability", "stockStatus", "stock_status")
                ?? FindFirstStringRecursive(front, "availability", "stockStatus", "stock_status", "captionType"),
            FirstBool(goods, "isAvailable", "inStock"));
    }

    private static async Task<bool> PopulateFromLdJsonAsync(OutputProduct output, string html, CancellationToken cancellationToken)
    {
        var context = BrowsingContext.New(global::AngleSharp.Configuration.Default);
        var document = await context.OpenAsync(request => request.Content(html), cancellationToken);
        foreach (var script in document.QuerySelectorAll("script[type='application/ld+json']"))
        {
            try
            {
                using var json = JsonDocument.Parse(script.TextContent);
                var product = FindLdProduct(json.RootElement);
                if (product is null) continue;
                var value = product.Value;
                if (string.IsNullOrWhiteSpace(output.Name)) output.Name = Trim(FirstString(value, "name"));
                if (string.IsNullOrWhiteSpace(output.Description)) output.Description = ToPlainText(FirstString(value, "description"));
                if (string.IsNullOrWhiteSpace(output.Brand)) output.Brand = Trim(FindNamedValue(value, "brand"));
                if (value.TryGetProperty("image", out var image))
                {
                    var images = image.ValueKind == JsonValueKind.Array
                        ? image.EnumerateArray().Where(item => item.ValueKind == JsonValueKind.String).Select(item => item.GetString()!).ToList()
                        : image.ValueKind == JsonValueKind.String ? [image.GetString()!] : [];
                    if (images.Count > 0 && output.Photos == "[]") output.Photos = JsonSerializer.Serialize(images.Distinct().ToList(), JsonOptions);
                }
                if (value.TryGetProperty("offers", out var offers))
                {
                    var offer = offers.ValueKind == JsonValueKind.Array ? offers.EnumerateArray().FirstOrDefault() : offers;
                    output.Price ??= FirstDecimal(offer, "price", "lowPrice");
                    var currency = FirstString(offer, "priceCurrency");
                    if (!string.IsNullOrWhiteSpace(currency)) output.Currency = currency;
                    output.Availability = NormalizeAvailability(FirstString(offer, "availability"), null);
                }
                return true;
            }
            catch (JsonException) { }
        }
        return false;
    }

    private static async Task<bool> PopulateFromEmbeddedJsonAsync(OutputProduct output, string html, CancellationToken cancellationToken)
    {
        var context = BrowsingContext.New(global::AngleSharp.Configuration.Default);
        var document = await context.OpenAsync(request => request.Content(html), cancellationToken);
        foreach (var script in document.QuerySelectorAll("script[type='application/json']:not(#__NEXT_DATA__)"))
        {
            if (!script.TextContent.Contains("goodsName", StringComparison.OrdinalIgnoreCase)) continue;
            try
            {
                PopulateFromNextData(output, script.TextContent);
                if (!string.IsNullOrWhiteSpace(output.Name) || !string.IsNullOrWhiteSpace(output.GoodsId)) return true;
            }
            catch (JsonException) { }
        }
        return false;
    }

    private static async Task<bool> PopulateFromDomAsync(OutputProduct output, string html, CancellationToken cancellationToken)
    {
        var context = BrowsingContext.New(global::AngleSharp.Configuration.Default);
        var document = await context.OpenAsync(request => request.Content(html), cancellationToken);
        string Meta(string property) => document.QuerySelector($"meta[property='{property}'],meta[name='{property}']")?.GetAttribute("content")?.Trim() ?? "";
        string Item(string property) => document.QuerySelector($"[itemprop='{property}']")?.GetAttribute("content")?.Trim()
            ?? document.QuerySelector($"[itemprop='{property}']")?.TextContent.Trim() ?? "";

        if (string.IsNullOrWhiteSpace(output.Name)) output.Name = Meta("og:title");
        if (string.IsNullOrWhiteSpace(output.Description)) output.Description = ToPlainText(Meta("og:description"));
        if (string.IsNullOrWhiteSpace(output.Brand)) output.Brand = Item("brand");
        output.Price ??= decimal.TryParse(Regex.Replace(Meta("product:price:amount"), "[^0-9.]", ""), out var price) ? price : null;
        var currency = Meta("product:price:currency");
        if (!string.IsNullOrWhiteSpace(currency)) output.Currency = currency;
        if (output.Photos == "[]")
        {
            var images = document.QuerySelectorAll("meta[property='og:image']")
                .Select(node => node.GetAttribute("content")?.Trim())
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Distinct(StringComparer.Ordinal)
                .ToList();
            if (images.Count > 0) output.Photos = JsonSerializer.Serialize(images, JsonOptions);
        }
        return !string.IsNullOrWhiteSpace(output.Name);
    }

    private static JsonElement? FindLdProduct(JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.Object)
        {
            if (FirstString(element, "@type")?.Equals("Product", StringComparison.OrdinalIgnoreCase) == true) return element;
            if (element.TryGetProperty("@graph", out var graph)) return FindLdProduct(graph);
        }
        if (element.ValueKind == JsonValueKind.Array)
            foreach (var item in element.EnumerateArray()) { var found = FindLdProduct(item); if (found is not null) return found; }
        return null;
    }

    private static void PopulateVisual(OutputProduct output, string json)
    {
        var response = JsonSerializer.Deserialize<ZozoMainVisualResponse>(json, JsonOptions) ?? new();
        var photos = response.Images
            .OrderBy(image => image.Type == "GOODS_MAIN" ? 0 : image.Type == "GOODS_SUB" ? 1 : 2)
            .Select(image => Trim(image.OriginalUrl)).Where(value => value.Length > 0).Distinct(StringComparer.Ordinal).ToList();
        var colors = response.Images.Where(image => image.ColorId is not null && !string.IsNullOrWhiteSpace(image.ColorName))
            .Select(image => new ZozoColor(image.ColorId!.Value, image.ColorName!.Trim()))
            .DistinctBy(color => (color.Id, color.Name)).ToList();
        output.Photos = JsonSerializer.Serialize(photos, JsonOptions);
        output.Colors = JsonSerializer.Serialize(colors, JsonOptions);
        output.Movies = JsonSerializer.Serialize(response.Movies, JsonOptions);
    }

    private static void PopulateSizes(OutputProduct output, string json)
    {
        var response = JsonSerializer.Deserialize<ZozoSizeResponse>(json, JsonOptions) ?? new();
        var sizes = response.GoodsSizes.Where(item => !string.IsNullOrWhiteSpace(item.SizeName))
            .Select(item => new ZozoSize(item.SizeId, item.SizeName!.Trim(), Trim(item.SizeShortName).Length > 0 ? item.SizeShortName!.Trim() : item.SizeName.Trim()))
            .DistinctBy(size => (size.Id, size.Name)).ToList();
        var specs = response.GoodsSizes.Where(item => !string.IsNullOrWhiteSpace(item.SizeName))
            .Select(item => new ZozoSizeSpecs(item.SizeName!.Trim(), ReadSpecs(item.Specs)))
            .Where(item => item.Specs.Count > 0).ToList();
        var variants = response.GoodsSizes.Where(item => !string.IsNullOrWhiteSpace(item.SizeName))
            .Select(item => new ZozoVariant(item.ColorId, Trim(item.ColorName), item.SizeId, item.SizeName!.Trim(), item.IsAvailable))
            .Distinct().ToList();
        output.Sizes = JsonSerializer.Serialize(sizes, JsonOptions);
        output.SizeSpecs = JsonSerializer.Serialize(specs, JsonOptions);
        output.Variants = JsonSerializer.Serialize(variants, JsonOptions);
    }

    private static Dictionary<string, string> ReadSpecs(JsonElement element)
    {
        var result = new Dictionary<string, string>(StringComparer.Ordinal);
        if (element.ValueKind == JsonValueKind.Object)
        {
            foreach (var property in element.EnumerateObject())
                if (property.Value.ValueKind is JsonValueKind.String or JsonValueKind.Number) result[property.Name] = property.Value.ToString().Trim();
        }
        else if (element.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in element.EnumerateArray())
            {
                var name = FirstString(item, "name", "specName", "spec_name");
                var value = FirstString(item, "value", "specValue", "spec_value");
                if (!string.IsNullOrWhiteSpace(name) && !string.IsNullOrWhiteSpace(value)) result[name.Trim()] = value.Trim();
            }
        }
        return result;
    }

    private static JsonElement? TryPath(JsonElement element, params string[] path)
    {
        foreach (var segment in path)
        {
            if (element.ValueKind != JsonValueKind.Object || !element.TryGetProperty(segment, out element)) return null;
        }
        return element;
    }

    private static JsonElement? TryProperty(JsonElement element, string name) =>
        element.ValueKind == JsonValueKind.Object && element.TryGetProperty(name, out var value) ? value : null;

    private static JsonElement? FindObjectWithProperty(JsonElement element, string propertyName)
    {
        if (element.ValueKind == JsonValueKind.Object)
        {
            if (element.TryGetProperty(propertyName, out _)) return element;
            foreach (var property in element.EnumerateObject())
            {
                var found = FindObjectWithProperty(property.Value, propertyName);
                if (found is not null) return found;
            }
        }
        else if (element.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in element.EnumerateArray())
            {
                var found = FindObjectWithProperty(item, propertyName);
                if (found is not null) return found;
            }
        }
        return null;
    }

    private static string? FirstString(JsonElement element, params string[] names)
    {
        if (element.ValueKind != JsonValueKind.Object) return null;
        foreach (var property in element.EnumerateObject())
        {
            if (!names.Any(name => property.Name.Equals(name, StringComparison.OrdinalIgnoreCase))) continue;
            if (property.Value.ValueKind == JsonValueKind.String) return property.Value.GetString();
            if (property.Value.ValueKind == JsonValueKind.Number) return property.Value.GetRawText();
        }
        return null;
    }

    private static string? FindFirstStringRecursive(JsonElement element, params string[] names)
    {
        var direct = FirstString(element, names);
        if (direct is not null) return direct;
        if (element.ValueKind == JsonValueKind.Object)
        {
            foreach (var property in element.EnumerateObject())
            {
                var found = FindFirstStringRecursive(property.Value, names);
                if (found is not null) return found;
            }
        }
        else if (element.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in element.EnumerateArray())
            {
                var found = FindFirstStringRecursive(item, names);
                if (found is not null) return found;
            }
        }
        return null;
    }

    private static string? FindNestedIdRecursive(JsonElement element, params string[] objectNames)
    {
        if (element.ValueKind == JsonValueKind.Object)
        {
            foreach (var property in element.EnumerateObject())
            {
                if (objectNames.Any(name => property.Name.Equals(name, StringComparison.OrdinalIgnoreCase)))
                {
                    var id = FirstString(property.Value, "id", "value");
                    if (id is not null) return id;
                }
                var found = FindNestedIdRecursive(property.Value, objectNames);
                if (found is not null) return found;
            }
        }
        else if (element.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in element.EnumerateArray())
            {
                var found = FindNestedIdRecursive(item, objectNames);
                if (found is not null) return found;
            }
        }
        return null;
    }

    private static string? FindNestedNameRecursive(JsonElement element, params string[] objectNames)
    {
        if (element.ValueKind == JsonValueKind.Object)
        {
            foreach (var property in element.EnumerateObject())
            {
                if (objectNames.Any(name => property.Name.Equals(name, StringComparison.OrdinalIgnoreCase)))
                {
                    var name = FirstString(property.Value, "name", "brandName", "brand_name");
                    if (name is not null) return name;
                }
                var found = FindNestedNameRecursive(property.Value, objectNames);
                if (found is not null) return found;
            }
        }
        else if (element.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in element.EnumerateArray())
            {
                var found = FindNestedNameRecursive(item, objectNames);
                if (found is not null) return found;
            }
        }
        return null;
    }

    private static decimal? FirstDecimal(JsonElement element, params string[] names)
    {
        foreach (var name in names)
        {
            if (element.ValueKind != JsonValueKind.Object || !element.TryGetProperty(name, out var value)) continue;
            if (value.ValueKind == JsonValueKind.Number && value.TryGetDecimal(out var number)) return number;
            if (value.ValueKind == JsonValueKind.String && decimal.TryParse(Regex.Replace(value.GetString() ?? "", "[^0-9.]", ""), out number)) return number;
            if (value.ValueKind == JsonValueKind.Object)
            {
                var nested = FirstDecimal(value, "value", "price", "amount");
                if (nested is not null) return nested;
            }
        }
        return null;
    }

    private static bool? FirstBool(JsonElement element, params string[] names)
    {
        foreach (var name in names)
            if (element.ValueKind == JsonValueKind.Object && element.TryGetProperty(name, out var value) && value.ValueKind is JsonValueKind.True or JsonValueKind.False) return value.GetBoolean();
        return null;
    }

    private static string? FindNamedValue(JsonElement element, params string[] names)
    {
        foreach (var name in names)
        {
            if (element.ValueKind != JsonValueKind.Object || !element.TryGetProperty(name, out var value)) continue;
            if (value.ValueKind == JsonValueKind.String) return value.GetString();
            if (value.ValueKind == JsonValueKind.Object) return FirstString(value, "name", "brandName", "brand_name");
        }
        return null;
    }

    private static string NormalizeAvailability(string? raw, bool? available)
    {
        if (available is true) return "InStock";
        if (available is false) return "OutOfStock";
        if (string.IsNullOrWhiteSpace(raw)) return "Unknown";
        if (raw.Contains("INSTOCK", StringComparison.OrdinalIgnoreCase)) return "InStock";
        if (raw.Contains("OUTOFSTOCK", StringComparison.OrdinalIgnoreCase) || raw.Contains("SOLDOUT", StringComparison.OrdinalIgnoreCase)) return "OutOfStock";
        return raw.Trim();
    }
    private static string ToPlainText(string? value)
    {
        var document = new AngleSharp.Html.Parser.HtmlParser().ParseDocument(value ?? "");
        return Regex.Replace(document.Body?.TextContent ?? document.DocumentElement.TextContent, @"\s+", " ").Trim();
    }
    private static string Trim(string? value) => value?.Trim() ?? "";
    private static string Display(string value) => string.IsNullOrWhiteSpace(value) ? "not found" : value;
    private static string EmptyFallback(string value, string fallback) => string.IsNullOrWhiteSpace(value) ? fallback : value;
    private static bool AllPresent(params string[] values) => values.All(value => !string.IsNullOrWhiteSpace(value));
    private static string CleanError(string value) => Regex.Replace(value, @"\s+", " ").Trim();
    private async Task SaveFailedHtmlAsync(string productId, string html, CancellationToken cancellationToken)
    {
        if (!saveFailedHtml) return;
        var safeId = string.Concat(productId.Select(character => Path.GetInvalidFileNameChars().Contains(character) ? '_' : character));
        var directory = Path.Combine(Directory.GetCurrentDirectory(), "errors", "html");
        Directory.CreateDirectory(directory);
        await File.WriteAllTextAsync(Path.Combine(directory, safeId + ".html"), html, cancellationToken);
    }
    private static ZozoProductResult Failed(OutputProduct output, string error) { output.Error = error; return new(output, false); }
    private static ZozoProductResult Blocked(OutputProduct output) { output.Error = "Blocked by ZOZO/Akamai"; return new(output, true); }
}
