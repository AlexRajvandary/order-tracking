namespace Products.Application.Shops.Models;

public sealed record ShopDto(
    Guid Id,
    string Name,
    string Slug,
    string? WebsiteUrl,
    string? Description,
    int SortOrder,
    bool IsActive);

public sealed record ShopListResult(IReadOnlyList<ShopDto> Items);
