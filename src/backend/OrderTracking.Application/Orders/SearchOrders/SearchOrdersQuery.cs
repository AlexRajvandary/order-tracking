using MediatR;
using OrderTracking.Application.Common.Models;
using OrderTracking.Application.Orders.Models;

namespace OrderTracking.Application.Orders.SearchOrders;

public sealed record SearchOrdersQuery(
    string? Q,
    string? TrackingCode,
    string? CustomerName,
    string? Phone,
    int Page = 1,
    int PageSize = 20) : IRequest<PaginatedList<OrderListItemDto>>;
