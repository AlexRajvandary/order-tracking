using MediatR;
using OrderTracking.Application.Common.Interfaces;

namespace OrderTracking.Application.Orders.DeleteOrderItem;

public sealed record DeleteOrderItemCommand(Guid OrderId, Guid ItemId) : IRequest, IAuditableCommand;
