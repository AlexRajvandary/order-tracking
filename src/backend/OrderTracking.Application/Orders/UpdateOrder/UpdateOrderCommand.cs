using MediatR;
using OrderTracking.Application.Orders.Models;

namespace OrderTracking.Application.Orders.UpdateOrder;

public sealed record UpdateOrderCommand(
    Guid Id,
    Guid? CustomerId,
    string? AdminNotes,
    DateTimeOffset? ExpectedDeliveryAt) : IRequest<OrderDetailsDto>;
