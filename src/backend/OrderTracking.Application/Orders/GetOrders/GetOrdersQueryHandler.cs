using MediatR;
using OrderTracking.Application.Common.Models;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Orders.Models;

namespace OrderTracking.Application.Orders.GetOrders;

public sealed class GetOrdersQueryHandler : IRequestHandler<GetOrdersQuery, PaginatedList<OrderListItemDto>>
{
    private readonly IOrderRepository _orderRepository;

    public GetOrdersQueryHandler(IOrderRepository orderRepository)
    {
        _orderRepository = orderRepository;
    }

    public async Task<PaginatedList<OrderListItemDto>> Handle(
        GetOrdersQuery request,
        CancellationToken cancellationToken)
    {
        var result = await _orderRepository.GetPagedAsync(
            request.Page,
            request.PageSize,
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
