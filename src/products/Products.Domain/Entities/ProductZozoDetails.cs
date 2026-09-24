namespace Products.Domain.Entities;

public sealed class ProductColor
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public long? ExternalId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public ICollection<ProductVariant> Variants { get; set; } = new List<ProductVariant>();
}

public sealed class ProductSize
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public long? ExternalId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ShortName { get; set; }
    public string? SpecificationsJson { get; set; }
    public int SortOrder { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public ICollection<ProductVariant> Variants { get; set; } = new List<ProductVariant>();
}

public sealed class ProductMedia
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public string MediaType { get; set; } = "Video";
    public long? ExternalId { get; set; }
    public string Url { get; set; } = string.Empty;
    public string? FileName { get; set; }
    public int SortOrder { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class ProductSourceDetail
{
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public string Source { get; set; } = "ZOZO";
    public string? Material { get; set; }
    public string? Availability { get; set; }
    public long? ExternalGoodsId { get; set; }
    public long? ExternalGoodsDetailId { get; set; }
    public long? ExternalGoodsTypeId { get; set; }
    public long? ExternalShopId { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
