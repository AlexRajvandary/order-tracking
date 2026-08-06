using FluentValidation;
using MediatR;
using Products.Application.Common.Interfaces;
using Products.Application.Products.ListProducts;
using Products.Domain.Enums;

namespace Products.Application.Products.SetProductsVisibility;

public sealed record SetProductsVisibilityCommand(
    bool IsActive,
    IReadOnlyList<Guid>? ProductIds = null,
    string? Search = null,
    bool? ActiveOnly = null,
    string? Brand = null,
    string? Shop = null,
    string? Condition = null,
    Guid? CategoryId = null,
    string? Category = null,
    bool IncludeCategoryChildren = true,
    decimal? PriceMin = null,
    decimal? PriceMax = null,
    bool MatchFilters = false) : IRequest<SetProductsVisibilityResult>;

public sealed record SetProductsVisibilityResult(int UpdatedCount);

public sealed class SetProductsVisibilityCommandValidator : AbstractValidator<SetProductsVisibilityCommand>
{
    public SetProductsVisibilityCommandValidator()
    {
        RuleFor(x => x)
            .Must(x =>
                (x.ProductIds is { Count: > 0 })
                || x.MatchFilters
                || x.CategoryId.HasValue
                || !string.IsNullOrWhiteSpace(x.Category))
            .WithMessage("Provide productIds, MatchFilters, and/or a category filter.");

        RuleFor(x => x.ProductIds)
            .Must(ids => ids is null || ids.Count <= 500)
            .WithMessage("At most 500 product ids can be updated at once.");

        RuleFor(x => x.Search).MaximumLength(200).When(x => !string.IsNullOrWhiteSpace(x.Search));
        RuleFor(x => x.Brand).MaximumLength(200).When(x => !string.IsNullOrWhiteSpace(x.Brand));
        RuleFor(x => x.Shop).MaximumLength(200).When(x => !string.IsNullOrWhiteSpace(x.Shop));
        RuleFor(x => x.Condition).MaximumLength(64).When(x => !string.IsNullOrWhiteSpace(x.Condition));
        RuleFor(x => x.Category).MaximumLength(200).When(x => !string.IsNullOrWhiteSpace(x.Category));
        RuleFor(x => x.PriceMin).GreaterThanOrEqualTo(0).When(x => x.PriceMin.HasValue);
        RuleFor(x => x.PriceMax).GreaterThanOrEqualTo(0).When(x => x.PriceMax.HasValue);
    }
}

public sealed class SetProductsVisibilityCommandHandler
    : IRequestHandler<SetProductsVisibilityCommand, SetProductsVisibilityResult>
{
    private readonly IProductRepository _products;

    public SetProductsVisibilityCommandHandler(IProductRepository products)
    {
        _products = products;
    }

    public async Task<SetProductsVisibilityResult> Handle(
        SetProductsVisibilityCommand request,
        CancellationToken cancellationToken)
    {
        IReadOnlyList<string>? brandSlugs = null;
        if (!string.IsNullOrWhiteSpace(request.Brand))
        {
            brandSlugs = request.Brand
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        }

        IReadOnlyList<string>? shopSlugs = null;
        if (!string.IsNullOrWhiteSpace(request.Shop))
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
                if (ListProductsQueryHandler.TryParseCondition(part, out var condition))
                    parsed.Add(condition);
            }
            if (parsed.Count > 0)
                conditions = parsed;
        }

        var updated = await _products.SetIsActiveAsync(
            request.IsActive,
            request.ProductIds,
            request.Search,
            request.ActiveOnly,
            brandSlugs,
            shopSlugs,
            conditions,
            request.CategoryId,
            request.Category,
            request.IncludeCategoryChildren,
            request.PriceMin,
            request.PriceMax,
            request.MatchFilters,
            cancellationToken);

        return new SetProductsVisibilityResult(updated);
    }
}
