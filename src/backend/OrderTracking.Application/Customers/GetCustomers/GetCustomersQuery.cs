using MediatR;
using OrderTracking.Application.Common.Models;
using OrderTracking.Application.Customers.Models;

namespace OrderTracking.Application.Customers.GetCustomers;

public sealed record GetCustomersQuery(int Page = 1, int PageSize = 20) : IRequest<PaginatedList<CustomerDto>>;
