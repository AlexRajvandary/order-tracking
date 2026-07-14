using MediatR;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Orders.Models;

namespace OrderTracking.Application.Orders.RestoreOrder;

public sealed record RestoreOrderCommand(Guid Id) : IRequest<OrderDetailsDto>, IAuditableCommand;
