using MediatR;
using OrderTracking.Application.Common.Models;
using OrderTracking.Application.Customers.Models;

namespace OrderTracking.Application.Customers.SearchCustomers;

public sealed record SearchCustomersQuery(
    string? Q,
    string? Phone,
    int Page = 1,
    int PageSize = 20) : IRequest<PaginatedList<CustomerDto>>;
