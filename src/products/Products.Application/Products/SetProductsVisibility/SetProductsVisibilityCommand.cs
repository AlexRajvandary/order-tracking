using FluentValidation;
using MediatR;
using Products.Application.Common.Interfaces;

namespace Products.Application.Products.SetProductsVisibility;

public sealed record SetProductsVisibilityCommand(
    bool IsActive,
    IReadOnlyList<Guid>? ProductIds = null,
    Guid? CategoryId = null,
    string? Category = null,
    bool IncludeCategoryChildren = true) : IRequest<SetProductsVisibilityResult>;

public sealed record SetProductsVisibilityResult(int UpdatedCount);

public sealed class SetProductsVisibilityCommandValidator : AbstractValidator<SetProductsVisibilityCommand>
{
    public SetProductsVisibilityCommandValidator()
    {
        RuleFor(x => x)
            .Must(x =>
                (x.ProductIds is { Count: > 0 })
                || x.CategoryId.HasValue
                || !string.IsNullOrWhiteSpace(x.Category))
            .WithMessage("Provide productIds and/or a category filter.");

        RuleFor(x => x.ProductIds)
            .Must(ids => ids is null || ids.Count <= 500)
            .WithMessage("At most 500 product ids can be updated at once.");

        RuleFor(x => x.Category).MaximumLength(200).When(x => !string.IsNullOrWhiteSpace(x.Category));
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
        var updated = await _products.SetIsActiveAsync(
            request.IsActive,
            request.ProductIds,
            request.CategoryId,
            request.Category,
            request.IncludeCategoryChildren,
            cancellationToken);

        return new SetProductsVisibilityResult(updated);
    }
}
