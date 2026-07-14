using MediatR;
using OrderTracking.Application.Common.Models;
using OrderTracking.Application.Customers.Models;

namespace OrderTracking.Application.Customers.GetCustomerOrders;

public sealed record GetCustomerOrdersQuery(
    Guid CustomerId,
    int Page = 1,
    int PageSize = 20) : IRequest<PaginatedList<CustomerOrderSummaryDto>>;
