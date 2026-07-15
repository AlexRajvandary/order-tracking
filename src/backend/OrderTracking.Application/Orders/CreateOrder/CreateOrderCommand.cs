using MediatR;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Customers.Models;
using OrderTracking.Application.Orders.Models;

namespace OrderTracking.Application.Orders.CreateOrder;

public sealed record CreateOrderNewCustomerDto(
    string? LastName,
    string? FirstName,
    string? Patronymic,
    string? Telegram,
    string? Phone,
    string? Email);

public sealed record CreateOrderCommand(
    Guid? CustomerId,
    CreateOrderNewCustomerDto? NewCustomer,
    string? AdminNotes,
    Guid? DeliveryAddressId,
    CreateOrderDeliveryAddressDto? DeliveryAddress,
    IReadOnlyList<CreateOrderItemDto>? Items) : IRequest<OrderDetailsDto>, IAuditableCommand;
