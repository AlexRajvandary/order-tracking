using MediatR;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Customers.Models;

namespace OrderTracking.Application.Customers.UpdateCustomer;

public sealed record UpdateCustomerCommand(
    Guid Id,
    string? LastName,
    string? FirstName,
    string? Patronymic,
    string? Telegram,
    string? Phone,
    string? Email,
    string? Notes) : IRequest<CustomerDto>, IAuditableCommand;
