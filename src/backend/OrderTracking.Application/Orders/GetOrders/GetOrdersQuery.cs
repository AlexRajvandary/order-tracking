using MediatR;
using OrderTracking.Application.Common.Models;
using OrderTracking.Application.Orders.Models;

namespace OrderTracking.Application.Orders.GetOrders;

public sealed record GetOrdersQuery(int Page = 1, int PageSize = 20) : IRequest<PaginatedList<OrderListItemDto>>;
