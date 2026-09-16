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
            product.NameRu,
            product.Slug,
            product.Description,
            product.Sku,
            product.Brand,
            product.BrandId,
            product.BrandEntity?.Slug,
            ToConditionSlug(product.Condition),
            product.Gender?.ToString().ToLowerInvariant(),
            product.ShopId,
            product.Shop?.Slug,
            product.Shop?.Name,
            product.CategoryId,
            product.Category?.Slug,
            product.Category?.Name,
            product.Price,
            product.CurrencyCode,
            product.OriginalPrice,
            product.OriginalCurrencyCode,
            product.ImageUrl,
            product.LocalImageUrl,
            product.SourceUrl,
            product.IsActive,
            product.CreatedAt,
            product.UpdatedAt,
            product.LaptopSpecification is null ? null : new LaptopSpecificationDto(
                product.LaptopSpecification.Model,
                product.LaptopSpecification.ModelNumber,
                product.LaptopSpecification.Color,
                product.LaptopSpecification.Processor,
                product.LaptopSpecification.RamGb,
                product.LaptopSpecification.StorageType,
                product.LaptopSpecification.StorageGb,
                product.LaptopSpecification.ScreenSizeInches,
                product.LaptopSpecification.OperatingSystem,
                product.LaptopSpecification.Office,
                product.LaptopSpecification.Graphics,
                product.LaptopSpecification.HasCopilotPlus,
                product.LaptopSpecification.ReleaseModel));

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
