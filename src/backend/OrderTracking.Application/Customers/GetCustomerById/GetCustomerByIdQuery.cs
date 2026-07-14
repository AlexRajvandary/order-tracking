using MediatR;
using OrderTracking.Application.Customers.Models;

namespace OrderTracking.Application.Customers.GetCustomerById;

public sealed record GetCustomerByIdQuery(Guid Id) : IRequest<CustomerDto>;
