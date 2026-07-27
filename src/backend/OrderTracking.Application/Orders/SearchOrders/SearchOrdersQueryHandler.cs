using MediatR;
using OrderTracking.Application.Common.Models;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Common.Persistence.Models;
using OrderTracking.Application.Orders.Models;

namespace OrderTracking.Application.Orders.SearchOrders;

public sealed class SearchOrdersQueryHandler : IRequestHandler<SearchOrdersQuery, PaginatedList<OrderListItemDto>>
{
    private readonly IOrderRepository _orderRepository;

    public SearchOrdersQueryHandler(IOrderRepository orderRepository)
    {
        _orderRepository = orderRepository;
    }

    public async Task<PaginatedList<OrderListItemDto>> Handle(
        SearchOrdersQuery request,
        CancellationToken cancellationToken)
    {
        var result = await _orderRepository.SearchAsync(
            new OrderSearchCriteria(
                request.TrackingCode, request.CustomerName, request.Phone, request.Q,
                request.Page, request.PageSize),
            cancellationToken);

        return new PaginatedList<OrderListItemDto>(
            result.Items.Select(Map).ToList(),
            result.TotalCount,
            result.Page,
            result.PageSize);
    }

    private static OrderListItemDto Map(Common.Persistence.Models.OrderListRow row) =>
        new(
            row.Id, row.TrackingCode, row.CustomerId, row.CustomerName, row.CustomerPhone,
            row.CustomerEmail, row.CustomerTelegram, row.AdminNotes, row.Status,
            row.ItemsCount, row.CreatedAt, row.UpdatedAt);
}
