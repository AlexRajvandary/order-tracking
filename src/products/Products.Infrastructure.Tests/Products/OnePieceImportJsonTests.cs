using System.Text.Json;
using Products.Application.Products.ImportProducts;
using Xunit;

namespace Products.Infrastructure.Tests.Import;

public sealed class OnePieceImportJsonTests
{
    private static readonly JsonSerializerOptions WebOptions = new(JsonSerializerDefaults.Web);

    [Fact]
    public void DeserializesOnePieceOctoparseFieldsWithoutJsonNameCollisions()
    {
        const string json = """
            {
              "Character": "Brook",
              "CardNumber": "ST29-011",
              "Rarity": "C",
              "Crew": "Straw Hat Pirates",
              "DevilFruit": "Yomi Yomi no Mi",
              "Role": "Musician",
              "FirstAppearance": "Chapter 442",
              "MercariLink": "https://example.com/mercari",
              "OffialLink": "https://example.com/official"
            }
            """;

        var item = JsonSerializer.Deserialize<ImportProductItem>(json, WebOptions);

        Assert.NotNull(item);
        Assert.Equal("Brook", item.OnePieceCharacterName);
        Assert.Equal("ST29-011", item.CardNumber);
        Assert.Equal("C", item.Rarity);
        Assert.Equal("Straw Hat Pirates", item.Crew);
        Assert.Equal("https://example.com/mercari", item.OnePieceMercariUrl);
        Assert.Equal("https://example.com/official", item.MisspelledOfficialUrl);
    }

    [Fact]
    public void KeepsNormalizedPokemonFormatCompatible()
    {
        const string json = """
            {
              "pokemon_name": "Pikachu",
              "set": "SV-P",
              "card_number": "001/SV-P",
              "image_url": "https://example.com/pikachu.jpg",
              "shop_links": { "mercari": "https://example.com/mercari" }
            }
            """;

        var item = JsonSerializer.Deserialize<ImportProductItem>(json, WebOptions);

        Assert.NotNull(item);
        Assert.Equal("Pikachu", item.PokemonName);
        Assert.Equal("SV-P", item.NormalizedSetName);
        Assert.Equal("001/SV-P", item.NormalizedCardNumber);
        Assert.Equal("https://example.com/pikachu.jpg", item.NormalizedImageUrl);
        Assert.Equal("https://example.com/mercari", item.NormalizedShopLinks!["mercari"]);
    }

    [Fact]
    public void DeserializesNormalizedYuGiOhFieldsWithOriginalsAndTranslations()
    {
        const string json = """
            {
              "name": "恋する乙女",
              "nameRu": "Влюблённая дева",
              "description": "日本語の説明",
              "descriptionRu": "Описание на русском",
              "imageUrl": "https://example.com/card.jpg",
              "franchise": "yu-gi-oh",
              "setName": "LIMITED PACK GX - オシリスレッド -",
              "setNameRu": "LIMITED PACK GX — Красный Осирис",
              "cardType": "Monster",
              "cardSubtype": "Effect",
              "attribute": "LIGHT",
              "monsterRaceRaw": "魔法使い族 / 効果",
              "monsterRaceRu": "Заклинатель / Эффект",
              "seriesMetadataRaw": "Booster Pack · 2025-09-13 · 56 cards",
              "seriesType": "Booster Pack",
              "seriesTypeRu": "Бустер",
              "releaseDate": "2025-09-13",
              "declaredCardCount": 56,
              "level": 2,
              "attack": 400,
              "defense": 300,
              "shopLinks": { "mercari": "https://example.com/mercari" }
            }
            """;

        var item = JsonSerializer.Deserialize<ImportProductItem>(json, WebOptions);

        Assert.NotNull(item);
        Assert.Equal("恋する乙女", item.Name);
        Assert.Equal("Влюблённая дева", item.NameRu);
        Assert.Equal("Описание на русском", item.DescriptionRu);
        Assert.Equal("LIMITED PACK GX — Красный Осирис", item.SetNameRu);
        Assert.Equal("Monster", item.CardType);
        Assert.Equal("魔法使い族 / 効果", item.MonsterRaceRaw);
        Assert.Equal("Заклинатель / Эффект", item.MonsterRaceRu);
        Assert.Equal("Booster Pack · 2025-09-13 · 56 cards", item.SeriesMetadataRaw);
        Assert.Equal(new DateOnly(2025, 9, 13), item.ReleaseDate);
        Assert.Equal(56, item.DeclaredCardCount);
        Assert.Equal(400, item.Attack);
        Assert.Equal("https://example.com/mercari", item.ShopLinks!["mercari"]);
    }
}
