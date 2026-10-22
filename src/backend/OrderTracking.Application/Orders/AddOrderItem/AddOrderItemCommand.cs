using MediatR;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Orders.Models;

namespace OrderTracking.Application.Orders.AddOrderItem;

public sealed record AddOrderItemCommand(
    Guid OrderId,
    string Name,
    string? Description,
    int Quantity = 1,
    decimal? UnitPrice = null,
    string? CurrencyCode = null,
    string? SourceUrl = null) : IRequest<OrderItemDto>, IAuditableCommand;
