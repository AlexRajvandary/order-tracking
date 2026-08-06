namespace Products.Application.Products.Models;

public sealed record ProductDto(
    Guid Id,
    string Name,
    string Slug,
    string? Description,
    string? Sku,
    string? Brand,
    Guid? BrandId,
    string? BrandSlug,
    string Condition,
    Guid? ShopId,
    string? ShopSlug,
    string? ShopName,
    decimal Price,
    string CurrencyCode,
    decimal? OriginalPrice,
    string? OriginalCurrencyCode,
    string ImageUrl,
    string? SourceUrl,
    bool IsActive,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);

public sealed record ProductListResult(
    IReadOnlyList<ProductDto> Items,
    int Total,
    int Page,
    int PageSize);

public sealed record ProductAuditDto(
    Guid Id,
    Guid ProductId,
    string Action,
    Guid? ActorAdminId,
    string? ActorLogin,
    string? OldValues,
    string? NewValues,
    DateTimeOffset CreatedAt);

public sealed record ProductAuditListResult(
    IReadOnlyList<ProductAuditDto> Items,
    int Total,
    int Page,
    int PageSize);
