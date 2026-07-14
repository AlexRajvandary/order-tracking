using MediatR;
using OrderTracking.Application.Orders.Models;

namespace OrderTracking.Application.Orders.GetOrderById;

public sealed record GetOrderByIdQuery(Guid Id) : IRequest<OrderDetailsDto>;
