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
    string? Gender = null,
    Guid? CategoryId = null,
    string? Category = null,
    bool IncludeCategoryChildren = false,
    decimal? PriceMin = null,
    decimal? PriceMax = null,
    string? LaptopModel = null,
    string? LaptopProcessor = null,
    string? LaptopRamGb = null,
    string? LaptopStorageType = null,
    string? LaptopStorageGb = null,
    string? LaptopScreenSize = null,
    string? LaptopOperatingSystem = null,
    string? TcgCharacter = null,
    string? TcgSet = null,
    string? TcgRarity = null,
    string? TcgCrew = null,
    string? YuGiOhCardType = null,
    string? YuGiOhCardSubtype = null,
    string? YuGiOhAttribute = null,
    string? YuGiOhMonsterRace = null,
    string? YuGiOhSeriesType = null,
    int Page = 1,
    int PageSize = 20,
    string? Sort = null,
    int? ShuffleSeed = null) : IRequest<ProductListResult>;

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
        RuleFor(x => x.Gender).MaximumLength(64).When(x => !string.IsNullOrWhiteSpace(x.Gender));
        RuleFor(x => x.Category).MaximumLength(200).When(x => !string.IsNullOrWhiteSpace(x.Category));
        RuleFor(x => x.Sort)
            .Must(value => string.IsNullOrWhiteSpace(value) || value.Equals("mixed", StringComparison.OrdinalIgnoreCase))
            .WithMessage("Sort must be 'mixed'");
        RuleFor(x => x.PriceMin).GreaterThanOrEqualTo(0).When(x => x.PriceMin.HasValue);
        RuleFor(x => x.PriceMax).GreaterThanOrEqualTo(0).When(x => x.PriceMax.HasValue);
        RuleFor(x => x.LaptopModel).MaximumLength(2000);
        RuleFor(x => x.LaptopProcessor).MaximumLength(2000);
        RuleFor(x => x.LaptopOperatingSystem).MaximumLength(2000);
        RuleFor(x => x.TcgCharacter).MaximumLength(4000);
        RuleFor(x => x.TcgSet).MaximumLength(4000);
        RuleFor(x => x.TcgRarity).MaximumLength(4000);
        RuleFor(x => x.TcgCrew).MaximumLength(4000);
        RuleFor(x => x.YuGiOhCardType).MaximumLength(4000);
        RuleFor(x => x.YuGiOhCardSubtype).MaximumLength(4000);
        RuleFor(x => x.YuGiOhAttribute).MaximumLength(4000);
        RuleFor(x => x.YuGiOhMonsterRace).MaximumLength(4000);
        RuleFor(x => x.YuGiOhSeriesType).MaximumLength(4000);
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

        IReadOnlyList<ProductGender>? genders = null;
        if (!string.IsNullOrWhiteSpace(request.Gender))
        {
            var parsed = request.Gender
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(value => TryParseGender(value, out var gender) ? (ProductGender?)gender : null)
                .Where(value => value.HasValue)
                .Select(value => value!.Value)
                .Distinct()
                .ToList();
            if (parsed.Count > 0) genders = parsed;
        }

        var (items, total) = await _products.SearchAsync(
            request.Search,
            request.ActiveOnly,
            brandIds,
            brandSlugs,
            shopIds,
            shopSlugs,
            conditions,
            genders,
            request.CategoryId,
            request.Category,
            request.IncludeCategoryChildren,
            request.PriceMin,
            request.PriceMax,
            new LaptopFilterCriteria(
                ParseStrings(request.LaptopModel),
                ParseStrings(request.LaptopProcessor),
                ParseInts(request.LaptopRamGb),
                ParseStrings(request.LaptopStorageType),
                ParseInts(request.LaptopStorageGb),
                ParseDecimals(request.LaptopScreenSize),
                ParseStrings(request.LaptopOperatingSystem)),
            ParseStrings(request.TcgCharacter),
            ParseStrings(request.TcgSet),
            ParseStrings(request.TcgRarity),
            ParseStrings(request.TcgCrew),
            new YuGiOhFilterCriteria(
                ParseStrings(request.YuGiOhCardType),
                ParseStrings(request.YuGiOhCardSubtype),
                ParseStrings(request.YuGiOhAttribute),
                ParseStrings(request.YuGiOhMonsterRace),
                ParseStrings(request.YuGiOhSeriesType)),
            request.Page,
            request.PageSize,
            request.Sort?.Equals("mixed", StringComparison.OrdinalIgnoreCase) == true,
            request.ShuffleSeed ?? 0,
            cancellationToken);

        return new ProductListResult(
            items.Select(p => p.ToDto()).ToList(),
            total,
            request.Page,
            request.PageSize);
    }

    private static IReadOnlyList<string>? ParseStrings(string? value)
    {
        var values = value?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        return values is { Count: > 0 } ? values : null;
    }

    private static IReadOnlyList<int>? ParseInts(string? value)
    {
        var values = ParseStrings(value)?.Select(x => int.TryParse(x, out var n) ? (int?)n : null)
            .Where(x => x.HasValue).Select(x => x!.Value).Distinct().ToList();
        return values is { Count: > 0 } ? values : null;
    }

    private static IReadOnlyList<decimal>? ParseDecimals(string? value)
    {
        var values = ParseStrings(value)?.Select(x => decimal.TryParse(
                x, System.Globalization.NumberStyles.Number,
                System.Globalization.CultureInfo.InvariantCulture, out var n) ? (decimal?)n : null)
            .Where(x => x.HasValue).Select(x => x!.Value).Distinct().ToList();
        return values is { Count: > 0 } ? values : null;
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

    internal static bool TryParseGender(string? raw, out ProductGender gender)
    {
        gender = ProductGender.Unisex;
        if (string.IsNullOrWhiteSpace(raw)) return false;
        return raw.Trim().ToLowerInvariant() switch
        {
            "unisex" => Assign(ProductGender.Unisex, out gender),
            "men" or "male" => Assign(ProductGender.Men, out gender),
            "women" or "female" => Assign(ProductGender.Women, out gender),
            "kids" or "children" => Assign(ProductGender.Kids, out gender),
            _ => Enum.TryParse(raw, true, out gender),
        };
    }

    private static bool Assign(ProductGender value, out ProductGender gender)
    {
        gender = value;
        return true;
    }
}
