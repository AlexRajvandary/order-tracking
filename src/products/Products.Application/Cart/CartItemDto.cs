namespace Products.Application.Cart
{
    public sealed record CartItemDto(string Source,
                                     string Id,
                                     Guid? ProductId,
                                     string? ExternalId,
                                     string Slug,
                                     string Name,
                                     decimal Price,
                                     string CurrencyCode,
                                     string? ImageUrl,
                                     string? SourceUrl,
                                     string? AffiliateUrl,
                                     string? ShopName,
                                     bool Available,
                                     int Quantity,
                                     DateTimeOffset UpdatedAt,
                                     string? SelectedColor,
                                     string? SelectedSize);
}