using FluentValidation;
using MediatR;
using Products.Application.Common.Exceptions;
using Products.Application.Common.Interfaces;
using Products.Application.Products.ListProducts;
using Products.Domain.Enums;

namespace Products.Application.Products.BulkUpdateProducts;

public sealed record BulkUpdateProductsCommand(
    IReadOnlyList<Guid>? ProductIds = null,
    bool MatchFilters = false,
    string? Search = null,
    bool? ActiveOnly = null,
    string? Brand = null,
    string? Shop = null,
    string? Condition = null,
    string? Category = null,
    bool IncludeCategoryChildren = true,
    decimal? PriceMin = null,
    decimal? PriceMax = null,
    bool UpdateCategory = false,
    Guid? NewCategoryId = null,
    bool UpdateShop = false,
    Guid? NewShopId = null) : IRequest<BulkUpdateProductsResult>;

public sealed record BulkUpdateProductsResult(int UpdatedCount);

public sealed class BulkUpdateProductsCommandValidator : AbstractValidator<BulkUpdateProductsCommand>
{
    public BulkUpdateProductsCommandValidator()
    {
        RuleFor(x => x).Must(x => x.ProductIds is { Count: > 0 } || x.MatchFilters)
            .WithMessage("Provide productIds or enable MatchFilters.");
        RuleFor(x => x).Must(x => x.UpdateCategory || x.UpdateShop)
            .WithMessage("Select a category and/or shop field to update.");
        RuleFor(x => x.ProductIds).Must(ids => ids is null || ids.Count <= 500)
            .WithMessage("At most 500 product ids can be updated at once.");
    }
}

public sealed class BulkUpdateProductsCommandHandler
    : IRequestHandler<BulkUpdateProductsCommand, BulkUpdateProductsResult>
{
    private readonly IProductRepository _products;
    private readonly ICategoryRepository _categories;
    private readonly IShopRepository _shops;

    public BulkUpdateProductsCommandHandler(
        IProductRepository products,
        ICategoryRepository categories,
        IShopRepository shops)
    {
        _products = products;
        _categories = categories;
        _shops = shops;
    }

    public async Task<BulkUpdateProductsResult> Handle(
        BulkUpdateProductsCommand request,
        CancellationToken cancellationToken)
    {
        if (request.UpdateCategory && request.NewCategoryId is { } categoryId)
            _ = await _categories.GetByIdAsync(categoryId, cancellationToken)
                ?? throw new NotFoundException($"Category {categoryId} was not found.");
        if (request.UpdateShop && request.NewShopId is { } shopId)
            _ = await _shops.GetByIdAsync(shopId, cancellationToken)
                ?? throw new NotFoundException($"Shop {shopId} was not found.");

        IReadOnlyList<string>? brandSlugs = Split(request.Brand);
        IReadOnlyList<string>? shopSlugs = Split(request.Shop);
        IReadOnlyList<ProductCondition>? conditions = null;
        var conditionParts = Split(request.Condition);
        if (conditionParts is { Count: > 0 })
            conditions = conditionParts
                .Select(value => ListProductsQueryHandler.TryParseCondition(value, out var parsed) ? parsed : (ProductCondition?)null)
                .Where(value => value.HasValue).Select(value => value!.Value).ToList();

        var updated = await _products.BulkUpdateRelationsAsync(
            request.ProductIds, request.Search, request.ActiveOnly, brandSlugs, shopSlugs,
            conditions, null, request.Category, request.IncludeCategoryChildren,
            request.PriceMin, request.PriceMax, request.MatchFilters,
            request.UpdateCategory, request.NewCategoryId,
            request.UpdateShop, request.NewShopId,
            cancellationToken);
        return new BulkUpdateProductsResult(updated);
    }

    private static IReadOnlyList<string>? Split(string? value) => string.IsNullOrWhiteSpace(value)
        ? null
        : value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
}
