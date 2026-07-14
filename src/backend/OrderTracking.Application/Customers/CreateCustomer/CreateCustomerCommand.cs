using MediatR;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Customers.Models;

namespace OrderTracking.Application.Customers.CreateCustomer;

public sealed record CreateCustomerCommand(
    string? FullName,
    string? Telegram,
    string? Phone,
    string? Email,
    string? Notes) : IRequest<CustomerDto>, IAuditableCommand;
