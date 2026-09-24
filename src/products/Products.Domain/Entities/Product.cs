using Products.Domain.Common;
using Products.Domain.Enums;

namespace Products.Domain.Entities;

public class Product : AuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public string? NameRu { get; set; }
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
    public ICollection<ProductColor> ProductColors { get; set; } = new List<ProductColor>();
    public ICollection<ProductSize> ProductSizes { get; set; } = new List<ProductSize>();
    public ICollection<ProductMedia> ProductMedia { get; set; } = new List<ProductMedia>();
    public ProductSourceDetail? SourceDetail { get; set; }
    public LaptopSpecification? LaptopSpecification { get; set; }
    public TcgCardSpecification? TcgCardSpecification { get; set; }
    /// <summary>New or used (Б/У).</summary>
    public ProductCondition Condition { get; set; } = ProductCondition.New;
    public ProductGender? Gender { get; set; }
    public decimal Price { get; set; }
    public string CurrencyCode { get; set; } = "RUB";
    /// <summary>Price as listed at the source (before conversion).</summary>
    public decimal? OriginalPrice { get; set; }
    public string? OriginalCurrencyCode { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    /// <summary>Locally hosted image URL. Original ImageUrl is always preserved.</summary>
    public string? LocalImageUrl { get; set; }
    /// <summary>URL of this product on the source shop website.</summary>
    public string? SourceUrl { get; set; }
    public bool IsActive { get; set; } = true;
}
