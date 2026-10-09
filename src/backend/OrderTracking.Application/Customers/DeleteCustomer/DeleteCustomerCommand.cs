using MediatR;
using OrderTracking.Application.Common.Interfaces;

namespace OrderTracking.Application.Customers.DeleteCustomer;

public sealed record DeleteCustomerCommand(Guid Id) : IRequest, IAuditableCommand;
