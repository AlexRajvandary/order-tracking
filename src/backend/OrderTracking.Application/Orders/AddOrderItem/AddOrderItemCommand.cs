using MediatR;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Orders.Models;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Application.Orders.AddOrderItem;

public sealed record AddOrderItemCommand(
    Guid OrderId,
    OrderItemType ItemType,
    string Name,
    string? Description,
    int Quantity = 1,
    decimal? UnitPrice = null,
    string? CurrencyCode = null) : IRequest<OrderItemDto>, IAuditableCommand;
