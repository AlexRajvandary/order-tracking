using MediatR;
using OrderTracking.Application.Common.Interfaces;

namespace OrderTracking.Application.Statuses.DeactivateStatusDefinition;

public sealed record DeactivateStatusDefinitionCommand(Guid Id) : IRequest, IAuditableCommand;
