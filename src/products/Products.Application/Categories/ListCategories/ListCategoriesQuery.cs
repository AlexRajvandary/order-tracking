using MediatR;
using Products.Application.Categories.Models;
using Products.Application.Common.Interfaces;
using Products.Domain.Entities;

namespace Products.Application.Categories.ListCategories;

public sealed record ListCategoriesQuery(
    bool RootsOnly = false,
    bool PopularOnly = false,
    bool ActiveOnly = true,
    bool IncludeProductCounts = false,
    bool? ProductsActiveOnly = null) : IRequest<CategoryListResult>;

public sealed class ListCategoriesQueryHandler : IRequestHandler<ListCategoriesQuery, CategoryListResult>
{
    private readonly ICategoryRepository _categories;
    private readonly IProductRepository _products;

    public ListCategoriesQueryHandler(
        ICategoryRepository categories,
        IProductRepository products)
    {
        _categories = categories;
        _products = products;
    }

    public async Task<CategoryListResult> Handle(ListCategoriesQuery request, CancellationToken cancellationToken)
    {
        var all = await _categories.ListAsync(request.ActiveOnly, cancellationToken);
        var productCounts = request.IncludeProductCounts
            ? await _products.CountByCategoryAsync(request.ProductsActiveOnly, cancellationToken)
            : (new Dictionary<Guid, int>(), 0);

        IEnumerable<Category> roots = all.Where(c => c.ParentId is null);

        if (request.PopularOnly)
        {
            roots = roots.Where(c => c.IsPopular);
        }

        var tree = roots
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Name)
            .Select(c => ToDto(c, all, productCounts.ByCategory))
            .ToList();

        return new CategoryListResult(tree, productCounts.Total);
    }

    private static CategoryDto ToDto(
        Category category,
        IReadOnlyList<Category> all,
        IReadOnlyDictionary<Guid, int> directCounts)
    {
        var children = all
            .Where(c => c.ParentId == category.Id)
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Name)
            .Select(c => ToDto(c, all, directCounts))
            .ToList();

        var productCount = directCounts.GetValueOrDefault(category.Id)
            + children.Sum(child => child.ProductCount);

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
            productCount,
            children);
    }
}
