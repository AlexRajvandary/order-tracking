using MediatR;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Orders.Models;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Application.Orders.UpdateOrderItem;

public sealed record UpdateOrderItemCommand(
    Guid OrderId,
    Guid ItemId,
    OrderItemType ItemType,
    string Name,
    string? Description,
    int Quantity) : IRequest<OrderItemDto>, IAuditableCommand;
