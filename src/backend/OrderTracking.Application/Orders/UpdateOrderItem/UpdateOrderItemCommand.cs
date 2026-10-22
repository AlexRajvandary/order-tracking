using MediatR;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Orders.Models;

namespace OrderTracking.Application.Orders.UpdateOrderItem;

public sealed record UpdateOrderItemCommand(
    Guid OrderId,
    Guid ItemId,
    string Name,
    string? Description,
    int Quantity,
    decimal? UnitPrice,
    string? CurrencyCode,
    string? SourceUrl = null) : IRequest<OrderItemDto>, IAuditableCommand;
