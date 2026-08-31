using FluentValidation;
using MediatR;
using Products.Application.Common.Interfaces;
using Products.Application.Products.Models;

namespace Products.Application.Products.Translations;

public sealed record GetPendingTranslationsQuery(int Limit = 50) : IRequest<IReadOnlyList<ProductTranslationPendingDto>>;
public sealed class GetPendingTranslationsQueryValidator : AbstractValidator<GetPendingTranslationsQuery>
{
    public GetPendingTranslationsQueryValidator() => RuleFor(x => x.Limit).InclusiveBetween(1, 200);
}
public sealed class GetPendingTranslationsQueryHandler(IProductRepository products)
    : IRequestHandler<GetPendingTranslationsQuery, IReadOnlyList<ProductTranslationPendingDto>>
{
    public Task<IReadOnlyList<ProductTranslationPendingDto>> Handle(GetPendingTranslationsQuery request, CancellationToken cancellationToken) =>
        products.GetPendingTranslationsAsync(request.Limit, cancellationToken);
}

public sealed record SaveProductTranslationsCommand(IReadOnlyList<ProductTranslationResultDto> Items) : IRequest<SaveProductTranslationsResponse>;
public sealed class SaveProductTranslationsCommandValidator : AbstractValidator<SaveProductTranslationsCommand>
{
    public SaveProductTranslationsCommandValidator()
    {
        RuleFor(x => x.Items).NotEmpty().Must(items => items.Count <= 200);
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(x => x.NameRu).NotEmpty().MaximumLength(500);
        });
    }
}
public sealed class SaveProductTranslationsCommandHandler(IProductRepository products, IUnitOfWork uow)
    : IRequestHandler<SaveProductTranslationsCommand, SaveProductTranslationsResponse>
{
    public async Task<SaveProductTranslationsResponse> Handle(SaveProductTranslationsCommand request, CancellationToken cancellationToken)
    {
        var values = request.Items
            .Select(x => new { x.Id, NameRu = x.NameRu.Trim() })
            .Where(x => x.NameRu.Length > 0)
            .GroupBy(x => x.Id)
            .ToDictionary(x => x.Key, x => x.Last().NameRu);
        var result = await products.SaveTranslationsAsync(values, cancellationToken);
        if (result.Updated > 0) await uow.SaveChangesAsync(cancellationToken);
        return new SaveProductTranslationsResponse(request.Items.Count, result.Updated, result.NotFound);
    }
}

public sealed record GetProductTranslationStatsQuery : IRequest<ProductTranslationStatsDto>;
public sealed class GetProductTranslationStatsQueryHandler(IProductRepository products)
    : IRequestHandler<GetProductTranslationStatsQuery, ProductTranslationStatsDto>
{
    public Task<ProductTranslationStatsDto> Handle(GetProductTranslationStatsQuery request, CancellationToken cancellationToken) => products.GetTranslationStatsAsync(cancellationToken);
}
