using FluentValidation;
using MediatR;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Products.Application.Common.Interfaces;
using Products.Domain.Entities;
using Products.Domain.Enums;

namespace Products.Application.Products.ImportProducts;

public sealed record ImportProductsCommand(
    IReadOnlyList<ImportProductItem> Products,
    bool CreateMissingCategories = true) : IRequest<ImportProductsResult>;

public sealed record ImportTcgCharacter(
    string Name,
    string? Franchise = null,
    string? AlternateName = null,
    string? Crew = null,
    string? DevilFruit = null,
    string? Role = null,
    string? FirstAppearance = null);

public sealed record ImportProductItem(
    string? Name,
    decimal? Price,
    string? ImageUrl,
    string? NameRu = null,
    string? Slug = null,
    string? Description = null,
    string? Sku = null,
    string? Brand = null,
    Guid? BrandId = null,
    string? BrandSlug = null,
    string? CurrencyCode = null,
    decimal? OriginalPrice = null,
    string? OriginalCurrencyCode = null,
    string? SourceUrl = null,
    string? Condition = null,
    string? Gender = null,
    Guid? ShopId = null,
    string? ShopName = null,
    string? ShopSlug = null,
    Guid? CategoryId = null,
    IReadOnlyList<string>? Categories = null,
    string? Category = null,
    string? CategoryName = null,
    string? CategorySlug = null,
    Guid? ParentCategoryId = null,
    string? ParentCategory = null,
    string? ParentCategoryName = null,
    string? ParentCategorySlug = null,
    string? Model = null,
    string? ModelNumber = null,
    string? Color = null,
    string? Processor = null,
    int? RamGb = null,
    string? StorageType = null,
    int? StorageGb = null,
    decimal? ScreenSizeInches = null,
    string? OperatingSystem = null,
    string? Office = null,
    string? Graphics = null,
    bool? CopilotPlus = null,
    string? ReleaseModel = null,
    IReadOnlyList<string>? RawSpecifications = null,
    string? CharacterName = null,
    string? SetName = null,
    string? CardNumber = null,
    IReadOnlyDictionary<string, string>? ShopLinks = null,
    string? Franchise = null,
    string? Rarity = null,
    string? OfficialUrl = null,
    string? Crew = null,
    string? DevilFruit = null,
    string? Role = null,
    string? FirstAppearance = null,
    string? JapaneseNameReading = null,
    string? SetNameRu = null,
    string? CardType = null,
    string? CardSubtype = null,
    string? Attribute = null,
    string? StatsRaw = null,
    string? MonsterRaceRaw = null,
    string? MonsterRaceRu = null,
    string? DescriptionRu = null,
    string? SeriesMetadataRaw = null,
    string? SeriesAlternateName = null,
    string? SeriesAlternateNameRu = null,
    string? SeriesType = null,
    string? SeriesTypeRu = null,
    DateOnly? ReleaseDate = null,
    int? DeclaredCardCount = null,
    int? Level = null,
    int? Rank = null,
    int? LinkRating = null,
    int? Attack = null,
    int? Defense = null,
    IReadOnlyList<ImportTcgCharacter>? TcgCharacters = null,
    [property: JsonPropertyName("pokemon_name")] string? PokemonName = null,
    [property: JsonPropertyName("image_url")] string? NormalizedImageUrl = null,
    [property: JsonPropertyName("card_number")] string? NormalizedCardNumber = null,
    [property: JsonPropertyName("shop_links")] IReadOnlyDictionary<string, string>? NormalizedShopLinks = null,
    [property: JsonPropertyName("set")] string? NormalizedSetName = null,
    [property: JsonPropertyName("Character")] string? OnePieceCharacterName = null,
    [property: JsonPropertyName("Field1")] string? OctoparseCharacterName = null,
    [property: JsonPropertyName("Text1")] string? OctoparseSetName = null,
    [property: JsonPropertyName("Text2")] string? OctoparseCardNumber = null,
    [property: JsonPropertyName("URL")] string? OctoparseUrl = null,
    [property: JsonPropertyName("URL1")] string? MercariUrl = null,
    [property: JsonPropertyName("URL2")] string? MagiUrl = null,
    [property: JsonPropertyName("URL3")] string? SurugaYaUrl = null,
    [property: JsonPropertyName("URL4")] string? RakumaUrl = null,
    [property: JsonPropertyName("URL5")] string? RakutenUrl = null,
    [property: JsonPropertyName("MercariLink")] string? OnePieceMercariUrl = null,
    [property: JsonPropertyName("RakumaLink")] string? OnePieceRakumaUrl = null,
    [property: JsonPropertyName("YahooLink")] string? OnePieceYahooFleaUrl = null,
    [property: JsonPropertyName("RakutenLink")] string? OnePieceRakutenUrl = null,
    [property: JsonPropertyName("AmazonLink")] string? OnePieceAmazonUrl = null,
    [property: JsonPropertyName("_Link5")] string? OnePieceYahooShoppingUrl = null,
    [property: JsonPropertyName("_Link")] string? YuGiOhYahooAuctionUrl = null,
    [property: JsonPropertyName("_Link1")] string? YuGiOhMercariUrl = null,
    [property: JsonPropertyName("_Link2")] string? YuGiOhRakumaUrl = null,
    [property: JsonPropertyName("_Link3")] string? YuGiOhYahooFleaUrl = null,
    [property: JsonPropertyName("_Link4")] string? YuGiOhRakutenUrl = null,
    [property: JsonPropertyName("_Link6")] string? YuGiOhYahooShoppingUrl = null,
    [property: JsonPropertyName("Series")] string? YuGiOhSeries = null,
    [property: JsonPropertyName("Series2")] string? YuGiOhSeriesMetadataRaw = null,
    [property: JsonPropertyName("OffialLink")] string? MisspelledOfficialUrl = null,
    bool IsActive = true);

public sealed record ImportProductsResult(
    int Total,
    int InsertedCount,
    int SkippedCount,
    int FailedCount,
    int CategoriesCreatedCount,
    int BrandsCreatedCount,
    int ShopsCreatedCount,
    IReadOnlyList<ImportProductIssue> Issues);

public sealed record ImportProductIssue(int Index, string? Name, string Status, string Message);

public sealed class ImportProductsCommandValidator : AbstractValidator<ImportProductsCommand>
{
    public ImportProductsCommandValidator()
    {
        RuleFor(x => x.Products).Cascade(CascadeMode.Stop).NotNull().NotEmpty().Must(x => x.Count <= 100)
            .WithMessage("A single import batch can contain at most 100 products.");
    }
}

public sealed class ImportProductsCommandHandler
    : IRequestHandler<ImportProductsCommand, ImportProductsResult>
{
    private static readonly Regex UsedInNamePattern = new(
        @"(?<![\p{L}\p{N}])б\s*(?:/|-)\s*у(?![\p{L}\p{N}])",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    private readonly IProductRepository _products;
    private readonly ICategoryRepository _categories;
    private readonly IBrandRepository _brands;
    private readonly IShopRepository _shops;
    private readonly IProductAuditWriter _audit;
    private readonly IUnitOfWork _uow;

    public ImportProductsCommandHandler(
        IProductRepository products,
        ICategoryRepository categories,
        IBrandRepository brands,
        IShopRepository shops,
        IProductAuditWriter audit,
        IUnitOfWork uow)
    {
        _products = products;
        _categories = categories;
        _brands = brands;
        _shops = shops;
        _audit = audit;
        _uow = uow;
    }

    public async Task<ImportProductsResult> Handle(
        ImportProductsCommand request,
        CancellationToken cancellationToken)
    {
        var allCategories = (await _categories.ListAsync(false, cancellationToken)).ToList();
        var allBrands = (await _brands.ListAsync(false, cancellationToken)).ToList();
        var allShops = (await _shops.ListAsync(false, cancellationToken)).ToList();
        var allTcgCharacters = (await _products.ListTcgCharactersAsync(cancellationToken)).ToList();
        var allYuGiOhSets = (await _products.ListYuGiOhSetsAsync(cancellationToken)).ToList();
        var issues = new List<ImportProductIssue>();
        var batchSkus = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var batchSlugs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var inserted = 0;
        var skipped = 0;
        var categoriesCreated = 0;
        var brandsCreated = 0;
        var shopsCreated = 0;

        for (var index = 0; index < request.Products.Count; index++)
        {
            var item = request.Products[index];
            var resolvedName = ResolvedName(item);
            var validationError = ValidateItem(item);
            if (validationError is not null)
            {
                issues.Add(new ImportProductIssue(index, resolvedName, "failed", validationError));
                continue;
            }

            var referenceError = ValidateReferences(item, allCategories, allBrands, allShops);
            if (referenceError is not null)
            {
                issues.Add(new ImportProductIssue(index, resolvedName, "failed", referenceError));
                continue;
            }

            var name = resolvedName!;
            var sku = Clean(item.Sku);
            var hasExplicitSlug = !string.IsNullOrWhiteSpace(item.Slug);
            var requestedSlug = ImportSlug(hasExplicitSlug ? item.Slug! : name);

            if (sku is not null &&
                (batchSkus.Contains(sku) || await _products.IsSkuTakenAsync(sku, cancellationToken)))
            {
                skipped++;
                issues.Add(new ImportProductIssue(index, name, "skipped", "A product with this SKU already exists."));
                continue;
            }

            if (hasExplicitSlug &&
                (batchSlugs.Contains(requestedSlug) || await _products.IsSlugTakenAsync(requestedSlug, null, cancellationToken)))
            {
                skipped++;
                issues.Add(new ImportProductIssue(index, name, "skipped", "A product with this slug already exists."));
                continue;
            }

            var slug = requestedSlug;
            if (!hasExplicitSlug)
            {
                while (batchSlugs.Contains(slug) ||
                       await _products.IsSlugTakenAsync(slug, null, cancellationToken))
                {
                    slug = $"{requestedSlug}-{Guid.NewGuid().ToString("N")[..6]}";
                }
            }

            var categoryResult = ResolveCategory(item, allCategories, request.CreateMissingCategories);
            if (categoryResult.Error is not null)
            {
                issues.Add(new ImportProductIssue(index, name, "failed", categoryResult.Error));
                continue;
            }
            categoriesCreated += categoryResult.CreatedCount;

            var brandResult = ResolveBrand(item, allBrands);
            if (brandResult.Error is not null)
            {
                issues.Add(new ImportProductIssue(index, name, "failed", brandResult.Error));
                continue;
            }
            if (brandResult.Created) brandsCreated++;

            var shopResult = ResolveShop(item, allShops);
            if (shopResult.Error is not null)
            {
                issues.Add(new ImportProductIssue(index, name, "failed", shopResult.Error));
                continue;
            }
            if (shopResult.Created) shopsCreated++;

            var productId = Guid.NewGuid();
            var tcgSpecification = HasTcgSpecification(item) ? new TcgCardSpecification
            {
                ProductId = productId,
                CharacterName = ResolvedCharacterName(item),
                Franchise = ResolvedFranchise(item),
                SetName = ResolvedSetName(item),
                CardNumber = ResolvedCardNumber(item),
                Rarity = Clean(item.Rarity),
                OfficialUrl = ResolvedOfficialUrl(item),
                ShopLinksJson = System.Text.Json.JsonSerializer.Serialize(ResolvedShopLinks(item)),
            } : null;

            if (tcgSpecification is not null && HasYuGiOhMetadata(item))
            {
                tcgSpecification.Franchise ??= "yu-gi-oh";
                var yuGiOhSet = ResolveYuGiOhSet(item, allYuGiOhSets);
                tcgSpecification.YuGiOhSpecification = new YuGiOhCardSpecification
                {
                    ProductId = productId,
                    SetId = yuGiOhSet.Id,
                    Set = yuGiOhSet,
                    JapaneseNameReading = Clean(item.JapaneseNameReading),
                    SetNameRu = Clean(item.SetNameRu),
                    CardType = NormalizeYuGiOhCardType(item.CardType),
                    CardSubtype = Clean(item.CardSubtype),
                    Attribute = Clean(item.Attribute)?.ToUpperInvariant(),
                    StatsRaw = Clean(item.StatsRaw),
                    MonsterRaceRaw = Clean(item.MonsterRaceRaw),
                    MonsterRaceRu = Clean(item.MonsterRaceRu),
                    DescriptionRu = Clean(item.DescriptionRu),
                    SeriesMetadataRaw = Clean(item.SeriesMetadataRaw) ?? Clean(item.YuGiOhSeriesMetadataRaw),
                    SeriesAlternateName = Clean(item.SeriesAlternateName),
                    SeriesAlternateNameRu = Clean(item.SeriesAlternateNameRu),
                    SeriesType = Clean(item.SeriesType),
                    SeriesTypeRu = Clean(item.SeriesTypeRu),
                    ReleaseDate = item.ReleaseDate,
                    DeclaredCardCount = item.DeclaredCardCount,
                    Level = item.Level,
                    Rank = item.Rank,
                    LinkRating = item.LinkRating,
                    Attack = item.Attack,
                    Defense = item.Defense,
                };
            }

            if (tcgSpecification is not null)
            {
                foreach (var importedCharacter in ResolvedTcgCharacters(item))
                {
                    var character = ResolveTcgCharacter(importedCharacter, allTcgCharacters);
                    tcgSpecification.Characters.Add(new TcgCardCharacter
                    {
                        ProductId = productId,
                        CharacterId = character.Id,
                        Character = character,
                    });
                }
            }

            var product = new Product
            {
                Id = productId,
                Name = name,
                NameRu = Clean(item.NameRu),
                Slug = slug,
                Description = Clean(item.Description),
                Sku = sku,
                Brand = brandResult.Brand?.Name ?? Clean(item.Brand),
                BrandId = brandResult.Brand?.Id,
                Price = item.Price ?? 0,
                CurrencyCode = (Clean(item.CurrencyCode) ?? "RUB").ToUpperInvariant(),
                OriginalPrice = item.OriginalPrice,
                OriginalCurrencyCode = Clean(item.OriginalCurrencyCode)?.ToUpperInvariant(),
                ImageUrl = ResolvedImageUrl(item)!,
                SourceUrl = Clean(item.SourceUrl),
                Condition = UsedInNamePattern.IsMatch(name)
                    ? ProductCondition.Used
                    : ListProducts.ListProductsQueryHandler.TryParseCondition(
                        item.Condition ?? "new", out var condition)
                        ? condition
                        : ProductCondition.New,
                Gender = ListProducts.ListProductsQueryHandler.TryParseGender(item.Gender, out var gender)
                    ? gender
                    : null,
                ShopId = shopResult.Shop?.Id,
                CategoryId = categoryResult.Category?.Id,
                IsActive = item.IsActive,
                LaptopSpecification = HasLaptopSpecification(item) ? new LaptopSpecification
                {
                    Model = Clean(item.Model),
                    ModelNumber = Clean(item.ModelNumber),
                    Color = Clean(item.Color),
                    Processor = Clean(item.Processor),
                    RamGb = item.RamGb,
                    StorageType = Clean(item.StorageType)?.ToUpperInvariant(),
                    StorageGb = item.StorageGb,
                    ScreenSizeInches = item.ScreenSizeInches,
                    OperatingSystem = Clean(item.OperatingSystem),
                    Office = Clean(item.Office),
                    Graphics = Clean(item.Graphics),
                    HasCopilotPlus = item.CopilotPlus,
                    ReleaseModel = Clean(item.ReleaseModel),
                    RawSpecificationsJson = item.RawSpecifications is null
                        ? null
                        : System.Text.Json.JsonSerializer.Serialize(item.RawSpecifications),
                } : null,
                TcgCardSpecification = tcgSpecification,
            };

            if (sku is not null) batchSkus.Add(sku);
            batchSlugs.Add(slug);
            _products.Add(product);
            await _audit.WriteAsync(product.Id, ProductAuditActions.Created, null, product, cancellationToken);
            inserted++;
        }

        if (inserted > 0 || categoriesCreated > 0 || brandsCreated > 0 || shopsCreated > 0)
            await _uow.SaveChangesAsync(cancellationToken);

        return new ImportProductsResult(
            request.Products.Count,
            inserted,
            skipped,
            issues.Count(x => x.Status == "failed"),
            categoriesCreated,
            brandsCreated,
            shopsCreated,
            issues);
    }

    private static string? ValidateItem(ImportProductItem item)
    {
        var name = ResolvedName(item);
        var imageUrl = ResolvedImageUrl(item);
        if (string.IsNullOrWhiteSpace(name)) return "Name is required (or provide pokemon_name for a TCG card).";
        if (name.Length > 500) return "Name cannot exceed 500 characters.";
        if (Clean(item.Sku) is { Length: > 100 }) return "Sku cannot exceed 100 characters.";
        if (Clean(item.Brand) is { Length: > 200 }) return "Brand cannot exceed 200 characters.";
        if (!string.IsNullOrWhiteSpace(item.Gender)
            && !ListProducts.ListProductsQueryHandler.TryParseGender(item.Gender, out _))
            return "Gender must be one of: unisex, men, women, kids.";
        if ((!HasTcgSpecification(item) && !item.Price.HasValue) || item.Price < 0) return "Price must be zero or greater.";
        if (string.IsNullOrWhiteSpace(imageUrl)) return "ImageUrl is required.";
        if (imageUrl.Length > 2000) return "ImageUrl cannot exceed 2000 characters.";
        if (Clean(item.SourceUrl) is { Length: > 2000 }) return "SourceUrl cannot exceed 2000 characters.";
        if (Clean(item.ShopName) is { Length: > 200 }) return "ShopName cannot exceed 200 characters.";
        if (CategoryName(item) is { Length: > 200 }) return "Category name cannot exceed 200 characters.";
        if (ParentCategoryName(item) is { Length: > 200 })
            return "Parent category name cannot exceed 200 characters.";
        if (Clean(item.CurrencyCode) is { Length: not 3 }) return "CurrencyCode must contain 3 characters.";
        if (item.OriginalPrice < 0) return "OriginalPrice must be zero or greater.";
        if (item.OriginalPrice.HasValue && string.IsNullOrWhiteSpace(item.OriginalCurrencyCode))
            return "OriginalCurrencyCode is required when OriginalPrice is set.";
        if (Clean(item.OriginalCurrencyCode) is { Length: not 3 })
            return "OriginalCurrencyCode must contain 3 characters.";
        if (item.RamGb is < 0 or > 1024) return "RamGb must be between 0 and 1024.";
        if (item.StorageGb is < 0) return "StorageGb must be zero or greater.";
        if (item.ScreenSizeInches is < 0 or > 100) return "ScreenSizeInches must be between 0 and 100.";
        if (Clean(item.Model) is { Length: > 500 }) return "Model cannot exceed 500 characters.";
        if (Clean(item.ModelNumber) is { Length: > 200 }) return "ModelNumber cannot exceed 200 characters.";
        if (Clean(item.Color) is { Length: > 100 }) return "Color cannot exceed 100 characters.";
        if (Clean(item.Processor) is { Length: > 200 }) return "Processor cannot exceed 200 characters.";
        if (Clean(item.StorageType) is { Length: > 32 }) return "StorageType cannot exceed 32 characters.";
        if (Clean(item.OperatingSystem) is { Length: > 200 }) return "OperatingSystem cannot exceed 200 characters.";
        if (Clean(item.Office) is { Length: > 300 }) return "Office cannot exceed 300 characters.";
        if (Clean(item.Graphics) is { Length: > 200 }) return "Graphics cannot exceed 200 characters.";
        if (Clean(item.ReleaseModel) is { Length: > 200 }) return "ReleaseModel cannot exceed 200 characters.";
        if (ResolvedCharacterName(item) is { Length: > 200 }) return "CharacterName cannot exceed 200 characters.";
        if (ResolvedSetName(item) is { Length: > 200 }) return "SetName cannot exceed 200 characters.";
        if (ResolvedCardNumber(item) is { Length: > 100 }) return "CardNumber cannot exceed 100 characters.";
        if (ResolvedFranchise(item) is { Length: > 100 }) return "Franchise cannot exceed 100 characters.";
        if (Clean(item.Rarity) is { Length: > 100 }) return "Rarity cannot exceed 100 characters.";
        if (ResolvedOfficialUrl(item) is { Length: > 2000 }) return "OfficialUrl cannot exceed 2000 characters.";
        if (Clean(item.Crew) is { Length: > 200 }) return "Crew cannot exceed 200 characters.";
        if (Clean(item.DevilFruit) is { Length: > 300 }) return "DevilFruit cannot exceed 300 characters.";
        if (Clean(item.Role) is { Length: > 300 }) return "Role cannot exceed 300 characters.";
        if (Clean(item.FirstAppearance) is { Length: > 200 }) return "FirstAppearance cannot exceed 200 characters.";
        if (Clean(item.NameRu) is { Length: > 500 }) return "NameRu cannot exceed 500 characters.";
        if (Clean(item.JapaneseNameReading) is { Length: > 500 }) return "JapaneseNameReading cannot exceed 500 characters.";
        if (Clean(item.SetNameRu) is { Length: > 500 }) return "SetNameRu cannot exceed 500 characters.";
        if (Clean(item.CardType) is { Length: > 30 }) return "CardType cannot exceed 30 characters.";
        if (Clean(item.CardSubtype) is { Length: > 50 }) return "CardSubtype cannot exceed 50 characters.";
        if (Clean(item.Attribute) is { Length: > 20 }) return "Attribute cannot exceed 20 characters.";
        if (Clean(item.StatsRaw) is { Length: > 100 }) return "StatsRaw cannot exceed 100 characters.";
        if (Clean(item.MonsterRaceRaw) is { Length: > 300 }) return "MonsterRaceRaw cannot exceed 300 characters.";
        if (Clean(item.MonsterRaceRu) is { Length: > 300 }) return "MonsterRaceRu cannot exceed 300 characters.";
        if (Clean(item.SeriesMetadataRaw) is { Length: > 500 } || Clean(item.YuGiOhSeriesMetadataRaw) is { Length: > 500 })
            return "SeriesMetadataRaw cannot exceed 500 characters.";
        if (Clean(item.SeriesAlternateName) is { Length: > 500 } || Clean(item.SeriesAlternateNameRu) is { Length: > 500 })
            return "SeriesAlternateName cannot exceed 500 characters.";
        if (Clean(item.SeriesType) is { Length: > 100 } || Clean(item.SeriesTypeRu) is { Length: > 100 })
            return "Series type cannot exceed 100 characters.";
        if (HasYuGiOhMetadata(item) && ResolvedSetName(item) is null)
            return "SetName is required for a Yu-Gi-Oh card.";
        if (item.DeclaredCardCount < 0 || item.Level < 0 || item.Rank < 0 || item.LinkRating < 0
            || item.Attack < 0 || item.Defense < 0)
            return "Yu-Gi-Oh numeric fields cannot be negative.";
        if (item.TcgCharacters?.Any(x => Clean(x.Name) is null
                || Clean(x.Name)!.Length > 200
                || Clean(x.Franchise) is { Length: > 100 }
                || Clean(x.AlternateName) is { Length: > 200 }
                || Clean(x.Crew) is { Length: > 200 }
                || Clean(x.DevilFruit) is { Length: > 300 }
                || Clean(x.Role) is { Length: > 300 }
                || Clean(x.FirstAppearance) is { Length: > 200 }) == true)
            return "One or more TCG character fields are invalid or too long.";
        if (ResolvedShopLinks(item).Any(x => x.Key.Length > 100 || x.Value.Length > 2000))
            return "Shop link names cannot exceed 100 characters and URLs cannot exceed 2000 characters.";
        return null;
    }

    private static bool HasTcgSpecification(ImportProductItem item) =>
        ResolvedCharacterName(item) is not null || ResolvedSetName(item) is not null
        || ResolvedCardNumber(item) is not null || ResolvedShopLinks(item).Count > 0
        || HasYuGiOhMetadata(item);

    private static string? ResolvedCharacterName(ImportProductItem item) =>
        Clean(item.CharacterName) ?? Clean(item.PokemonName) ?? Clean(item.OnePieceCharacterName)
        ?? Clean(item.OctoparseCharacterName);

    private static string? ResolvedFranchise(ImportProductItem item) =>
        Clean(item.Franchise)?.ToLowerInvariant()
        ?? (HasYuGiOhMetadata(item) ? "yu-gi-oh" : null)
        ?? (Clean(item.OnePieceCharacterName) is not null || HasOnePieceMetadata(item) ? "one-piece" : null)
        ?? (Clean(item.PokemonName) is not null ? "pokemon" : null);

    private static string? ResolvedSetName(ImportProductItem item) =>
        Clean(item.SetName) ?? Clean(item.NormalizedSetName) ?? Clean(item.OctoparseSetName)
        ?? Clean(item.YuGiOhSeries)
        ?? SetFromCardNumber(ResolvedCardNumber(item));

    private static string? SetFromCardNumber(string? cardNumber)
    {
        var separator = cardNumber?.IndexOf('-') ?? -1;
        return separator > 0 ? cardNumber![..separator] : null;
    }

    private static string? ResolvedCardNumber(ImportProductItem item) =>
        (Clean(item.CardNumber) ?? Clean(item.NormalizedCardNumber) ?? Clean(item.OctoparseCardNumber))
            ?.Replace("No:", string.Empty, StringComparison.OrdinalIgnoreCase).Trim();

    private static string? ResolvedImageUrl(ImportProductItem item) =>
        Clean(item.ImageUrl) ?? Clean(item.NormalizedImageUrl)
        ?? (HasYuGiOhMetadata(item) ? Clean(item.OctoparseUrl) : null);

    private static Dictionary<string, string> ResolvedShopLinks(ImportProductItem item) =>
        (item.ShopLinks ?? item.NormalizedShopLinks
            ?? (HasYuGiOhMetadata(item) ? YuGiOhShopLinks(item) : OctoparseShopLinks(item)))
            .Where(x => Clean(x.Key) is not null && Clean(x.Value) is not null)
            .GroupBy(x => Clean(x.Key)!, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(x => x.Key, x => Clean(x.Last().Value)!, StringComparer.OrdinalIgnoreCase);

    private static Dictionary<string, string> OctoparseShopLinks(ImportProductItem item) =>
        new Dictionary<string, string>
        {
            ["yahoo_auction"] = item.OctoparseUrl ?? string.Empty,
            ["mercari"] = item.OnePieceMercariUrl ?? item.MercariUrl ?? string.Empty,
            ["magi"] = item.MagiUrl ?? string.Empty,
            ["suruga_ya"] = item.SurugaYaUrl ?? string.Empty,
            ["rakuma"] = item.OnePieceRakumaUrl ?? item.RakumaUrl ?? string.Empty,
            ["yahoo_flea_market"] = item.OnePieceYahooFleaUrl ?? string.Empty,
            ["rakuten"] = item.OnePieceRakutenUrl ?? item.RakutenUrl ?? string.Empty,
            ["amazon_japan"] = item.OnePieceAmazonUrl ?? string.Empty,
            ["yahoo_shopping"] = item.OnePieceYahooShoppingUrl ?? string.Empty,
        };

    private static Dictionary<string, string> YuGiOhShopLinks(ImportProductItem item) =>
        new()
        {
            ["yahoo_auction"] = item.YuGiOhYahooAuctionUrl ?? string.Empty,
            ["mercari"] = item.YuGiOhMercariUrl ?? string.Empty,
            ["rakuma"] = item.YuGiOhRakumaUrl ?? string.Empty,
            ["yahoo_flea_market"] = item.YuGiOhYahooFleaUrl ?? string.Empty,
            ["rakuten"] = item.YuGiOhRakutenUrl ?? string.Empty,
            ["amazon_japan"] = item.OnePieceYahooShoppingUrl ?? string.Empty,
            ["yahoo_shopping"] = item.YuGiOhYahooShoppingUrl ?? string.Empty,
        };

    private static string? ResolvedOfficialUrl(ImportProductItem item) =>
        Clean(item.OfficialUrl) ?? Clean(item.MisspelledOfficialUrl);

    private static bool HasOnePieceMetadata(ImportProductItem item) =>
        Clean(item.Crew) is not null || Clean(item.DevilFruit) is not null
        || Clean(item.Role) is not null || Clean(item.FirstAppearance) is not null
        || Clean(item.MisspelledOfficialUrl) is not null;

    private static bool HasYuGiOhMetadata(ImportProductItem item) =>
        Clean(item.JapaneseNameReading) is not null || Clean(item.CardType) is not null
        || Clean(item.StatsRaw) is not null || Clean(item.MonsterRaceRaw) is not null
        || Clean(item.YuGiOhSeries) is not null || Clean(item.YuGiOhSeriesMetadataRaw) is not null
        || Clean(item.SeriesMetadataRaw) is not null;

    private static string? NormalizeYuGiOhCardType(string? raw)
    {
        var value = Clean(raw);
        if (value is null) return null;
        if (value.Contains("Monster", StringComparison.OrdinalIgnoreCase)) return "Monster";
        if (value.Contains("Spell", StringComparison.OrdinalIgnoreCase)) return "Spell";
        if (value.Contains("Trap", StringComparison.OrdinalIgnoreCase)) return "Trap";
        return value;
    }

    private YuGiOhSet ResolveYuGiOhSet(ImportProductItem item, List<YuGiOhSet> sets)
    {
        var nameOriginal = ResolvedSetName(item)!;
        var sourceKey = YuGiOhSetSourceKey(nameOriginal, item.ReleaseDate);
        var set = sets.FirstOrDefault(x =>
            string.Equals(x.SourceKey, sourceKey, StringComparison.OrdinalIgnoreCase));

        if (set is null)
        {
            set = new YuGiOhSet
            {
                Id = Guid.NewGuid(),
                SourceKey = sourceKey,
                NameOriginal = nameOriginal,
                NameRu = Clean(item.SetNameRu),
                MetadataRaw = Clean(item.SeriesMetadataRaw) ?? Clean(item.YuGiOhSeriesMetadataRaw),
                AlternateNameOriginal = Clean(item.SeriesAlternateName),
                AlternateNameRu = Clean(item.SeriesAlternateNameRu),
                ReleaseTypeCode = Clean(item.SeriesType),
                ReleaseTypeRu = Clean(item.SeriesTypeRu),
                ReleaseDate = item.ReleaseDate,
                DeclaredCardCount = item.DeclaredCardCount,
            };
            sets.Add(set);
            _products.Add(set);
            return set;
        }

        set.NameRu ??= Clean(item.SetNameRu);
        set.MetadataRaw ??= Clean(item.SeriesMetadataRaw) ?? Clean(item.YuGiOhSeriesMetadataRaw);
        set.AlternateNameOriginal ??= Clean(item.SeriesAlternateName);
        set.AlternateNameRu ??= Clean(item.SeriesAlternateNameRu);
        set.ReleaseTypeCode ??= Clean(item.SeriesType);
        set.ReleaseTypeRu ??= Clean(item.SeriesTypeRu);
        set.ReleaseDate ??= item.ReleaseDate;
        set.DeclaredCardCount ??= item.DeclaredCardCount;
        return set;
    }

    private static string YuGiOhSetSourceKey(string nameOriginal, DateOnly? releaseDate) =>
        $"{nameOriginal.Trim().ToUpperInvariant()}|{releaseDate:yyyy-MM-dd}";

    private static IReadOnlyList<ImportTcgCharacter> ResolvedTcgCharacters(ImportProductItem item)
    {
        if (item.TcgCharacters is { Count: > 0 })
            return item.TcgCharacters
                .Where(x => Clean(x.Name) is not null)
                .GroupBy(x => $"{Clean(x.Franchise)?.ToLowerInvariant()}|{Clean(x.Name)?.ToLowerInvariant()}")
                .Select(x => x.First())
                .ToList();
        return ResolvedCharacterName(item) is { } name
            ? [new ImportTcgCharacter(
                name,
                ResolvedFranchise(item),
                Crew: Clean(item.Crew),
                DevilFruit: Clean(item.DevilFruit),
                Role: Clean(item.Role),
                FirstAppearance: Clean(item.FirstAppearance))]
            : [];
    }

    private TcgCharacter ResolveTcgCharacter(
        ImportTcgCharacter imported,
        List<TcgCharacter> characters)
    {
        var characterName = Clean(imported.Name)!;
        var franchise = Clean(imported.Franchise)?.ToLowerInvariant() ?? "tcg";
        var character = characters.FirstOrDefault(x =>
            string.Equals(x.Franchise, franchise, StringComparison.OrdinalIgnoreCase)
            && string.Equals(x.Name, characterName, StringComparison.OrdinalIgnoreCase));
        if (character is null)
        {
            character = new TcgCharacter
            {
                Id = Guid.NewGuid(),
                Franchise = franchise,
                Name = characterName,
                AlternateName = Clean(imported.AlternateName),
            };
            characters.Add(character);
            _products.Add(character);
        }

        if (string.Equals(franchise, "one-piece", StringComparison.OrdinalIgnoreCase))
        {
            character.OnePieceSpecification ??= new OnePieceCharacterSpecification
            {
                CharacterId = character.Id,
                Character = character,
            };
            character.OnePieceSpecification.Crew ??= Clean(imported.Crew);
            character.OnePieceSpecification.DevilFruit ??= Clean(imported.DevilFruit);
            character.OnePieceSpecification.Role ??= Clean(imported.Role);
            character.OnePieceSpecification.FirstAppearance ??= Clean(imported.FirstAppearance);
        }

        return character;
    }

    private static string? ResolvedName(ImportProductItem item)
    {
        var explicitName = Clean(item.Name);
        if (explicitName is not null) return explicitName;
        var character = ResolvedCharacterName(item);
        if (character is null) return null;
        return string.Join(" ", new[]
        {
            character,
            ResolvedSetName(item),
            ResolvedCardNumber(item) is { } number ? $"#{number}" : null,
        }.Where(x => x is not null));
    }

    private static bool HasLaptopSpecification(ImportProductItem item) =>
        item.Model is not null || item.ModelNumber is not null || item.Color is not null
        || item.Processor is not null || item.RamGb.HasValue || item.StorageType is not null
        || item.StorageGb.HasValue || item.ScreenSizeInches.HasValue
        || item.OperatingSystem is not null || item.Office is not null || item.Graphics is not null
        || item.CopilotPlus.HasValue || item.ReleaseModel is not null
        || item.RawSpecifications is { Count: > 0 };

    private static string? ValidateReferences(
        ImportProductItem item,
        IReadOnlyList<Category> categories,
        IReadOnlyList<Brand> brands,
        IReadOnlyList<Shop> shops)
    {
        if (item.CategoryId is { } categoryId && categories.All(x => x.Id != categoryId))
            return $"Category '{categoryId}' was not found.";
        if (item.ParentCategoryId is { } parentId && categories.All(x => x.Id != parentId))
            return $"Parent category '{parentId}' was not found.";
        if (item.BrandId is { } brandId && brands.All(x => x.Id != brandId))
            return $"Brand '{brandId}' was not found.";
        if (item.ShopId is { } shopId && shops.All(x => x.Id != shopId))
            return $"Shop '{shopId}' was not found.";
        return null;
    }

    private (Category? Category, int CreatedCount, string? Error) ResolveCategory(
        ImportProductItem item,
        List<Category> all,
        bool createMissing)
    {
        if (item.CategoryId is { } categoryId)
        {
            var existingById = all.FirstOrDefault(x => x.Id == categoryId);
            return existingById is null
                ? (null, 0, $"Category '{categoryId}' was not found.")
                : (existingById, 0, null);
        }

        var name = CategoryName(item);
        var slugSource = Clean(item.CategorySlug) ?? name;
        if (slugSource is null && HasTcgSpecification(item))
        {
            var tcg = all.FirstOrDefault(x => string.Equals(x.Slug, "tcg", StringComparison.OrdinalIgnoreCase));
            return tcg is null
                ? (null, 0, "Category with slug 'tcg' was not found. Select it in the import dialog.")
                : (tcg, 0, null);
        }
        if (slugSource is null) return (null, 0, null);

        var parentResult = ResolveParentCategory(item, all, createMissing);
        if (parentResult.Error is not null) return (null, parentResult.CreatedCount, parentResult.Error);

        var slug = ImportSlug(slugSource);
        var existing = all.FirstOrDefault(x =>
            x.ParentId == parentResult.Category?.Id &&
            string.Equals(x.Slug, slug, StringComparison.OrdinalIgnoreCase));
        if (existing is not null) return (existing, parentResult.CreatedCount, null);
        if (!createMissing)
            return (null, parentResult.CreatedCount, $"Category '{name ?? slug}' was not found.");

        var category = NewCategory(name ?? slug, slug, parentResult.Category?.Id);
        _categories.Add(category);
        all.Add(category);
        return (category, parentResult.CreatedCount + 1, null);
    }

    private (Category? Category, int CreatedCount, string? Error) ResolveParentCategory(
        ImportProductItem item,
        List<Category> all,
        bool createMissing)
    {
        if (item.ParentCategoryId is { } parentId)
        {
            var existingById = all.FirstOrDefault(x => x.Id == parentId);
            return existingById is null
                ? (null, 0, $"Parent category '{parentId}' was not found.")
                : (existingById, 0, null);
        }

        var name = ParentCategoryName(item);
        var slugSource = Clean(item.ParentCategorySlug) ?? name;
        if (slugSource is null) return (null, 0, null);

        var slug = ImportSlug(slugSource);
        var existing = all.FirstOrDefault(x => x.ParentId is null &&
            string.Equals(x.Slug, slug, StringComparison.OrdinalIgnoreCase));
        if (existing is not null) return (existing, 0, null);
        if (!createMissing) return (null, 0, $"Parent category '{name ?? slug}' was not found.");

        var category = NewCategory(name ?? slug, slug, null);
        _categories.Add(category);
        all.Add(category);
        return (category, 1, null);
    }

    private (Brand? Brand, bool Created, string? Error) ResolveBrand(
        ImportProductItem item,
        List<Brand> all)
    {
        if (item.BrandId is { } brandId)
        {
            var existingById = all.FirstOrDefault(x => x.Id == brandId);
            return existingById is null
                ? (null, false, $"Brand '{brandId}' was not found.")
                : (existingById, false, null);
        }

        var name = Clean(item.Brand);
        var slugSource = Clean(item.BrandSlug) ?? name;
        if (slugSource is null) return (null, false, null);
        var slug = ImportSlug(slugSource);
        var existing = all.FirstOrDefault(x => string.Equals(x.Slug, slug, StringComparison.OrdinalIgnoreCase));
        if (existing is not null) return (existing, false, null);

        var brand = new Brand { Id = Guid.NewGuid(), Name = name ?? slug, Slug = slug };
        _brands.Add(brand);
        all.Add(brand);
        return (brand, true, null);
    }

    private (Shop? Shop, bool Created, string? Error) ResolveShop(
        ImportProductItem item,
        List<Shop> all)
    {
        if (item.ShopId is { } shopId)
        {
            var existingById = all.FirstOrDefault(x => x.Id == shopId);
            return existingById is null
                ? (null, false, $"Shop '{shopId}' was not found.")
                : (existingById, false, null);
        }

        var name = Clean(item.ShopName);
        var slugSource = Clean(item.ShopSlug) ?? name;
        if (slugSource is null) return (null, false, null);
        var slug = ImportSlug(slugSource);
        var existing = all.FirstOrDefault(x => string.Equals(x.Slug, slug, StringComparison.OrdinalIgnoreCase));
        if (existing is not null) return (existing, false, null);

        var shop = new Shop { Id = Guid.NewGuid(), Name = name ?? slug, Slug = slug };
        _shops.Add(shop);
        all.Add(shop);
        return (shop, true, null);
    }

    private static Category NewCategory(string name, string slug, Guid? parentId) => new()
    {
        Id = Guid.NewGuid(),
        Name = name,
        Slug = slug,
        ParentId = parentId,
        IsActive = true,
    };

    private static string? Clean(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string? CategoryName(ImportProductItem item) =>
        Clean(item.CategoryName)
        ?? Clean(item.Category)
        ?? item.Categories?.Select(Clean).LastOrDefault(x => x is not null);

    private static string? ParentCategoryName(ImportProductItem item) =>
        Clean(item.ParentCategoryName)
        ?? Clean(item.ParentCategory)
        ?? item.Categories?.Select(Clean).Where(x => x is not null).Reverse().Skip(1).FirstOrDefault();

    private static string ImportSlug(string value)
    {
        var slug = ProductMappings.Slugify(value);
        return slug.Length <= 190 ? slug : slug[..190].TrimEnd('-');
    }
}
