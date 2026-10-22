using MediatR;
using OrderTracking.Application.Statuses.Models;

namespace OrderTracking.Application.Statuses.CreateStatusDefinition;

public sealed record CreateStatusDefinitionCommand(
    string Name,
    string? Color,
    string? DefaultCountry,
    string? DefaultLocation,
    int? PublishAfterDays,
    int SortOrder,
    bool IsFinal) : IRequest<StatusDefinitionDto>;
