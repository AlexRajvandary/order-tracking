namespace Products.Application.Categories.Models;

public sealed record CategoryDto(
    Guid Id,
    Guid? ParentId,
    string Name,
    string Slug,
    string? Description,
    string? ImageUrl,
    int SortOrder,
    bool IsPopular,
    bool IsActive,
    IReadOnlyList<CategoryDto> Children);

public sealed record CategoryListResult(IReadOnlyList<CategoryDto> Items);
