using MediatR;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Customers.Models;
using OrderTracking.Application.Orders.Models;

namespace OrderTracking.Application.Orders.CreateOrder;

public sealed record CreateOrderNewCustomerDto(
    string? FullName,
    string? Telegram,
    string? Phone,
    string? Email);

public sealed record CreateOrderCommand(
    Guid? CustomerId,
    CreateOrderNewCustomerDto? NewCustomer,
    string? AdminNotes,
    IReadOnlyList<CreateOrderItemDto>? Items) : IRequest<OrderDetailsDto>, IAuditableCommand;
