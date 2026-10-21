using System.Text;
using Products.Domain.Entities;

namespace Products.Application.Cart;

public static class CartItemMappings
{
    public static CartItemDto ToDto(CatalogCartItem item) => new(
        "Internal",
        item.ProductId.ToString(),
        item.ProductId,
        null,
        item.Product.Slug,
        item.Product.NameRu ?? item.Product.Name,
        item.Product.Price,
        item.Product.CurrencyCode,
        item.Product.LocalImageUrl ?? item.Product.ImageUrl,
        item.Product.SourceUrl,
        null,
        item.Product.Shop?.Name,
        item.Product.IsActive,
        item.Quantity,
        item.UpdatedAt,
        EmptyToNull(item.SelectedColor),
        EmptyToNull(item.SelectedSize));

    public static CartItemDto ToDto(Product product, CatalogCartItem item) => new(
        "Internal",
        product.Id.ToString(),
        product.Id,
        null,
        product.Slug,
        product.Name,
        product.Price,
        product.CurrencyCode,
        product.LocalImageUrl ?? product.ImageUrl,
        product.SourceUrl,
        null,
        product.Shop?.Name,
        true,
        item.Quantity,
        item.UpdatedAt,
        EmptyToNull(item.SelectedColor),
        EmptyToNull(item.SelectedSize));

    public static CartItemDto ToDto(ExternalProductCartItem item)
    {
        var id = "rakuten:" + Convert.ToBase64String(Encoding.UTF8.GetBytes(item.ExternalId))
            .TrimEnd('=').Replace('+', '-').Replace('/', '_');
        return new CartItemDto(
            item.Source, id, null, item.ExternalId, item.ExternalId, item.Name,
            item.UnitPrice, item.CurrencyCode, item.ImageUrl, item.SourceUrl,
            item.AffiliateUrl, item.ShopName, item.Available, item.Quantity,
            item.UpdatedAt, null, null);
    }

    private static string? EmptyToNull(string value) => value.Length == 0 ? null : value;
}
