using MediatR;
using Products.Application.Categories.Models;
using Products.Application.Common.Interfaces;
using Products.Domain.Entities;

namespace Products.Application.Categories.ListCategories;

public sealed record ListCategoriesQuery(
    bool RootsOnly = false,
    bool PopularOnly = false,
    bool ActiveOnly = true) : IRequest<CategoryListResult>;

public sealed class ListCategoriesQueryHandler : IRequestHandler<ListCategoriesQuery, CategoryListResult>
{
    private readonly ICategoryRepository _categories;

    public ListCategoriesQueryHandler(ICategoryRepository categories) => _categories = categories;

    public async Task<CategoryListResult> Handle(ListCategoriesQuery request, CancellationToken cancellationToken)
    {
        var all = await _categories.ListAsync(request.ActiveOnly, cancellationToken);

        IEnumerable<Category> roots = all.Where(c => c.ParentId is null);

        if (request.PopularOnly)
            roots = roots.Where(c => c.IsPopular);
        else if (request.RootsOnly)
            roots = roots; // explicit roots-only still returns children nested via ToDto

        var tree = roots
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Name)
            .Select(c => ToDto(c, all))
            .ToList();

        return new CategoryListResult(tree);
    }

    private static CategoryDto ToDto(Category category, IReadOnlyList<Category> all)
    {
        var children = all
            .Where(c => c.ParentId == category.Id)
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Name)
            .Select(c => ToDto(c, all))
            .ToList();

        return new CategoryDto(
            category.Id,
            category.ParentId,
            category.Name,
            category.Slug,
            category.Description,
            category.ImageUrl,
            category.SortOrder,
            category.IsPopular,
            category.IsActive,
            children);
    }
}
