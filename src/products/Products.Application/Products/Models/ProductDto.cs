namespace Products.Application.Products.Models;

public sealed record ProductDto(
    Guid Id,
    string Name,
    string? NameRu,
    string Slug,
    string? Description,
    string? Sku,
    string? Brand,
    Guid? BrandId,
    string? BrandSlug,
    string Condition,
    string? Gender,
    Guid? ShopId,
    string? ShopSlug,
    string? ShopName,
    Guid? CategoryId,
    string? CategorySlug,
    string? CategoryName,
    decimal Price,
    string CurrencyCode,
    decimal? OriginalPrice,
    string? OriginalCurrencyCode,
    string ImageUrl,
    string? LocalImageUrl,
    string? SourceUrl,
    bool IsActive,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt,
    LaptopSpecificationDto? LaptopSpecification);

public sealed record LaptopSpecificationDto(
    string? Model,
    string? ModelNumber,
    string? Color,
    string? Processor,
    int? RamGb,
    string? StorageType,
    int? StorageGb,
    decimal? ScreenSizeInches,
    string? OperatingSystem,
    string? Office,
    string? Graphics,
    bool? HasCopilotPlus,
    string? ReleaseModel);

public sealed record LaptopFilterCriteria(
    IReadOnlyList<string>? Models,
    IReadOnlyList<string>? Processors,
    IReadOnlyList<int>? RamGb,
    IReadOnlyList<string>? StorageTypes,
    IReadOnlyList<int>? StorageGb,
    IReadOnlyList<decimal>? ScreenSizes,
    IReadOnlyList<string>? OperatingSystems);

public sealed record LaptopFilterFacets(
    IReadOnlyList<string> Models,
    IReadOnlyList<string> Processors,
    IReadOnlyList<int> RamGb,
    IReadOnlyList<string> StorageTypes,
    IReadOnlyList<int> StorageGb,
    IReadOnlyList<decimal> ScreenSizes,
    IReadOnlyList<string> OperatingSystems);

public sealed record ProductTranslationPendingDto(Guid Id, string Name);
public sealed record ProductTranslationResultDto(Guid Id, string NameRu);
public sealed record SaveProductTranslationsRequest(IReadOnlyList<ProductTranslationResultDto> Items);
public sealed record ProductTranslationStatsDto(long Total, long Translated, long Remaining);
public sealed record SaveProductTranslationsResponse(int Requested, int Updated, int NotFound);

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
