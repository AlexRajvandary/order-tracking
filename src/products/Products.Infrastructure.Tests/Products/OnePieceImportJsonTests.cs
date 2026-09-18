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
}
