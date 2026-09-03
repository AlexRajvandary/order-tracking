using MediatR;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Customers.Models;

namespace OrderTracking.Application.Customers.CreateCustomer;

public sealed record CreateCustomerCommand(
    string? LastName,
    string? FirstName,
    string? Patronymic,
    string? Telegram,
    string? Phone,
    string? WhatsApp,
    string? Vk,
    string? Email,
    string? Notes) : IRequest<CustomerDto>, IAuditableCommand;
