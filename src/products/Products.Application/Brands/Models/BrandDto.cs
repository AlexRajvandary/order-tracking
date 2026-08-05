namespace Products.Application.Brands.Models;

public sealed record BrandDto(
    Guid Id,
    string Name,
    string Slug,
    string? Description,
    string? LogoUrl,
    int SortOrder,
    bool IsActive);

public sealed record BrandListResult(IReadOnlyList<BrandDto> Items);
