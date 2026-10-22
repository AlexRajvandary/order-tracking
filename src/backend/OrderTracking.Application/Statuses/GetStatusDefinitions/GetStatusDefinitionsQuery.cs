using MediatR;
using OrderTracking.Application.Statuses.Models;

namespace OrderTracking.Application.Statuses.GetStatusDefinitions;

public sealed record GetStatusDefinitionsQuery(
    bool IncludeInactive = false) : IRequest<IReadOnlyList<StatusDefinitionDto>>;
