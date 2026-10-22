using MediatR;
using OrderTracking.Application.Statuses.Models;

namespace OrderTracking.Application.Statuses.UpdateStatusDefinition;

public sealed record UpdateStatusDefinitionCommand(
    Guid Id,
    string Name,
    string? Color,
    string? DefaultCountry,
    string? DefaultLocation,
    int? PublishAfterDays,
    int SortOrder,
    bool IsActive,
    bool IsFinal) : IRequest<StatusDefinitionDto>;
