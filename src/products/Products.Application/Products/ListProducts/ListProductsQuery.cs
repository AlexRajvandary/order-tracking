using FluentValidation;
using MediatR;
using Products.Application.Common.Interfaces;
using Products.Application.Products.Models;
using Products.Domain.Enums;

namespace Products.Application.Products.ListProducts;

public sealed record ListProductsQuery(
    string? Search,
    bool? ActiveOnly,
    Guid? BrandId = null,
    string? Brand = null,
    Guid? ShopId = null,
    string? Shop = null,
    string? Condition = null,
    Guid? CategoryId = null,
    string? Category = null,
    bool IncludeCategoryChildren = false,
    decimal? PriceMin = null,
    decimal? PriceMax = null,
    int Page = 1,
    int PageSize = 20) : IRequest<ProductListResult>;

public sealed class ListProductsQueryValidator : AbstractValidator<ListProductsQuery>
{
    public ListProductsQueryValidator()
    {
        RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 100);
        RuleFor(x => x.Search).MaximumLength(200).When(x => !string.IsNullOrWhiteSpace(x.Search));
        RuleFor(x => x.Brand).MaximumLength(200).When(x => !string.IsNullOrWhiteSpace(x.Brand));
        RuleFor(x => x.Shop).MaximumLength(200).When(x => !string.IsNullOrWhiteSpace(x.Shop));
        RuleFor(x => x.Condition).MaximumLength(64).When(x => !string.IsNullOrWhiteSpace(x.Condition));
        RuleFor(x => x.Category).MaximumLength(200).When(x => !string.IsNullOrWhiteSpace(x.Category));
        RuleFor(x => x.PriceMin).GreaterThanOrEqualTo(0).When(x => x.PriceMin.HasValue);
        RuleFor(x => x.PriceMax).GreaterThanOrEqualTo(0).When(x => x.PriceMax.HasValue);
    }
}

public sealed class ListProductsQueryHandler : IRequestHandler<ListProductsQuery, ProductListResult>
{
    private readonly IProductRepository _products;

    public ListProductsQueryHandler(IProductRepository products)
    {
        _products = products;
    }

    public async Task<ProductListResult> Handle(ListProductsQuery request, CancellationToken cancellationToken)
    {
        IReadOnlyList<Guid>? brandIds = request.BrandId is { } brandId ? [brandId] : null;
        IReadOnlyList<string>? brandSlugs = null;
        if (brandIds is null && !string.IsNullOrWhiteSpace(request.Brand))
        {
            brandSlugs = request.Brand
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        }

        IReadOnlyList<Guid>? shopIds = request.ShopId is { } shopId ? [shopId] : null;
        IReadOnlyList<string>? shopSlugs = null;
        if (shopIds is null && !string.IsNullOrWhiteSpace(request.Shop))
        {
            shopSlugs = request.Shop
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        }

        IReadOnlyList<ProductCondition>? conditions = null;
        if (!string.IsNullOrWhiteSpace(request.Condition))
        {
            var parsed = new List<ProductCondition>();
            foreach (var part in request.Condition.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                if (TryParseCondition(part, out var condition))
                    parsed.Add(condition);
            }
            if (parsed.Count > 0)
                conditions = parsed;
        }

        var (items, total) = await _products.SearchAsync(
            request.Search,
            request.ActiveOnly,
            brandIds,
            brandSlugs,
            shopIds,
            shopSlugs,
            conditions,
            request.CategoryId,
            request.Category,
            request.IncludeCategoryChildren,
            request.PriceMin,
            request.PriceMax,
            request.Page,
            request.PageSize,
            cancellationToken);

        return new ProductListResult(
            items.Select(p => p.ToDto()).ToList(),
            total,
            request.Page,
            request.PageSize);
    }

    internal static bool TryParseCondition(string raw, out ProductCondition condition)
    {
        condition = ProductCondition.New;
        var key = raw.Trim().ToLowerInvariant();
        switch (key)
        {
            case "new":
            case "новое":
            case "novoe":
                condition = ProductCondition.New;
                return true;
            case "used":
            case "б/у":
            case "бу":
            case "bu":
            case "б-у":
                condition = ProductCondition.Used;
                return true;
            default:
                return Enum.TryParse(raw, ignoreCase: true, out condition);
        }
    }
}
