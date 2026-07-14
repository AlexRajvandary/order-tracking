using MediatR;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Orders.Models;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Application.Orders.UpdateOrderStatus;

public sealed record UpdateOrderStatusCommand(
    Guid Id,
    OrderStatus Status) : IRequest<OrderDetailsDto>, IAuditableCommand;
