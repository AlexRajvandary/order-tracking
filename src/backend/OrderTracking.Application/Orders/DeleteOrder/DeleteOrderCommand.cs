using MediatR;
using OrderTracking.Application.Common.Interfaces;

namespace OrderTracking.Application.Orders.DeleteOrder;

public sealed record DeleteOrderCommand(Guid Id) : IRequest, IAuditableCommand;
