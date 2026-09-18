using Products.Application.Products.Models;
using Products.Domain.Entities;
using Products.Domain.Enums;

namespace Products.Application.Products;

internal static class ProductMappings
{
    public static ProductDto ToDto(this Product product) =>
        new(
            product.Id,
            product.Name,
            product.NameRu,
            product.Slug,
            product.Description,
            product.Sku,
            product.Brand,
            product.BrandId,
            product.BrandEntity?.Slug,
            ToConditionSlug(product.Condition),
            product.Gender?.ToString().ToLowerInvariant(),
            product.ShopId,
            product.Shop?.Slug,
            product.Shop?.Name,
            product.CategoryId,
            product.Category?.Slug,
            product.Category?.Name,
            product.Price,
            product.CurrencyCode,
            product.OriginalPrice,
            product.OriginalCurrencyCode,
            product.ImageUrl,
            product.LocalImageUrl,
            product.SourceUrl,
            product.IsActive,
            product.CreatedAt,
            product.UpdatedAt,
            product.LaptopSpecification is null ? null : new LaptopSpecificationDto(
                product.LaptopSpecification.Model,
                product.LaptopSpecification.ModelNumber,
                product.LaptopSpecification.Color,
                product.LaptopSpecification.Processor,
                product.LaptopSpecification.RamGb,
                product.LaptopSpecification.StorageType,
                product.LaptopSpecification.StorageGb,
                product.LaptopSpecification.ScreenSizeInches,
                product.LaptopSpecification.OperatingSystem,
                product.LaptopSpecification.Office,
                product.LaptopSpecification.Graphics,
                product.LaptopSpecification.HasCopilotPlus,
                product.LaptopSpecification.ReleaseModel),
            product.TcgCardSpecification is null ? null : new TcgCardSpecificationDto(
                product.TcgCardSpecification.CharacterName,
                product.TcgCardSpecification.Franchise,
                product.TcgCardSpecification.SetName,
                product.TcgCardSpecification.CardNumber,
                product.TcgCardSpecification.Rarity,
                product.TcgCardSpecification.OfficialUrl,
                product.TcgCardSpecification.Characters.Select(link => new TcgCharacterDto(
                    link.Character.Id,
                    link.Character.Franchise,
                    link.Character.Name,
                    link.Character.AlternateName,
                    link.Character.OnePieceSpecification is null ? null : new OnePieceCharacterSpecificationDto(
                        link.Character.OnePieceSpecification.Crew,
                        link.Character.OnePieceSpecification.DevilFruit,
                        link.Character.OnePieceSpecification.Role,
                        link.Character.OnePieceSpecification.FirstAppearance))).ToList(),
                System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(
                    product.TcgCardSpecification.ShopLinksJson) ?? new Dictionary<string, string>(),
                product.TcgCardSpecification.YuGiOhSpecification is null ? null : new YuGiOhCardSpecificationDto(
                    product.TcgCardSpecification.YuGiOhSpecification.JapaneseNameReading,
                    product.TcgCardSpecification.YuGiOhSpecification.SetNameRu,
                    product.TcgCardSpecification.YuGiOhSpecification.CardType,
                    product.TcgCardSpecification.YuGiOhSpecification.CardSubtype,
                    product.TcgCardSpecification.YuGiOhSpecification.Attribute,
                    product.TcgCardSpecification.YuGiOhSpecification.StatsRaw,
                    product.TcgCardSpecification.YuGiOhSpecification.MonsterRaceRaw,
                    product.TcgCardSpecification.YuGiOhSpecification.MonsterRaceRu,
                    product.TcgCardSpecification.YuGiOhSpecification.DescriptionRu,
                    product.TcgCardSpecification.YuGiOhSpecification.SeriesMetadataRaw,
                    product.TcgCardSpecification.YuGiOhSpecification.SeriesAlternateName,
                    product.TcgCardSpecification.YuGiOhSpecification.SeriesAlternateNameRu,
                    product.TcgCardSpecification.YuGiOhSpecification.SeriesType,
                    product.TcgCardSpecification.YuGiOhSpecification.SeriesTypeRu,
                    product.TcgCardSpecification.YuGiOhSpecification.ReleaseDate,
                    product.TcgCardSpecification.YuGiOhSpecification.DeclaredCardCount,
                    product.TcgCardSpecification.YuGiOhSpecification.Level,
                    product.TcgCardSpecification.YuGiOhSpecification.Rank,
                    product.TcgCardSpecification.YuGiOhSpecification.LinkRating,
                    product.TcgCardSpecification.YuGiOhSpecification.Attack,
                    product.TcgCardSpecification.YuGiOhSpecification.Defense)));

    public static string ToConditionSlug(ProductCondition condition) =>
        condition switch
        {
            ProductCondition.Used => "used",
            _ => "new",
        };

    public static string Slugify(string name)
    {
        var slug = name.Trim().ToLowerInvariant();
        slug = System.Text.RegularExpressions.Regex.Replace(slug, @"[^a-z0-9\u0400-\u04FF]+", "-");
        slug = System.Text.RegularExpressions.Regex.Replace(slug, @"-+", "-").Trim('-');
        return string.IsNullOrWhiteSpace(slug) ? Guid.NewGuid().ToString("N")[..8] : slug;
    }
}
