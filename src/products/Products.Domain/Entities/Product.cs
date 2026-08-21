using Products.Domain.Common;
using Products.Domain.Enums;

namespace Products.Domain.Entities;

public class Product : AuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Sku { get; set; }
    /// <summary>Denormalized brand name for search/display.</summary>
    public string? Brand { get; set; }
    public Guid? BrandId { get; set; }
    public Brand? BrandEntity { get; set; }
    public Guid? ShopId { get; set; }
    public Shop? Shop { get; set; }
    public Guid? CategoryId { get; set; }
    public Category? Category { get; set; }
    public ICollection<ProductVariant> ProductVariants { get; set; } = new List<ProductVariant>();
    public ICollection<ProductImage> ProductImages { get; set; } = new List<ProductImage>();
    /// <summary>New or used (Б/У).</summary>
    public ProductCondition Condition { get; set; } = ProductCondition.New;
    public decimal Price { get; set; }
    public string CurrencyCode { get; set; } = "RUB";
    /// <summary>Price as listed at the source (before conversion).</summary>
    public decimal? OriginalPrice { get; set; }
    public string? OriginalCurrencyCode { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    /// <summary>URL of this product on the source shop website.</summary>
    public string? SourceUrl { get; set; }
    public bool IsActive { get; set; } = true;
}
