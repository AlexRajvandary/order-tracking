using Products.Application.Products.Models;
using Products.Domain.Entities;
using Products.Domain.Enums;

namespace Products.Application.Products;

internal static class ProductMappings
{
    public static ProductDto ToDto(this Product product) =>
        new(
            product.Id,
            product.Name,
            product.Slug,
            product.Description,
            product.Sku,
            product.Brand,
            ToConditionSlug(product.Condition),
            product.ShopId,
            product.Shop?.Slug,
            product.Shop?.Name,
            product.Price,
            product.CurrencyCode,
            product.OriginalPrice,
            product.OriginalCurrencyCode,
            product.ImageUrl,
            product.SourceUrl,
            product.IsActive,
            product.CreatedAt,
            product.UpdatedAt);

    public static string ToConditionSlug(ProductCondition condition) =>
        condition switch
        {
            ProductCondition.Used => "used",
            _ => "new",
        };

    public static string Slugify(string name)
    {
        var slug = name.Trim().ToLowerInvariant();
        slug = System.Text.RegularExpressions.Regex.Replace(slug, @"[^a-z0-9\u0400-\u04FF]+", "-");
        slug = System.Text.RegularExpressions.Regex.Replace(slug, @"-+", "-").Trim('-');
        return string.IsNullOrWhiteSpace(slug) ? Guid.NewGuid().ToString("N")[..8] : slug;
    }
}
