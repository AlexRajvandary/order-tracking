using MediatR;
using Products.Application.Common.Interfaces;
using Products.Application.Shops.Models;

namespace Products.Application.Shops.ListShops;

public sealed record ListShopsQuery(bool ActiveOnly = true) : IRequest<ShopListResult>;

public sealed class ListShopsQueryHandler : IRequestHandler<ListShopsQuery, ShopListResult>
{
    private readonly IShopRepository _shops;

    public ListShopsQueryHandler(IShopRepository shops) => _shops = shops;

    public async Task<ShopListResult> Handle(ListShopsQuery request, CancellationToken cancellationToken)
    {
        var items = await _shops.ListAsync(request.ActiveOnly, cancellationToken);
        return new ShopListResult(
            items.Select(s => new ShopDto(
                s.Id,
                s.Name,
                s.Slug,
                s.WebsiteUrl,
                s.Description,
                s.SortOrder,
                s.IsActive)).ToList());
    }
}
