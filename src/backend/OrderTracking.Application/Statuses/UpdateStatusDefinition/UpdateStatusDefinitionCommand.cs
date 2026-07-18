using MediatR;
using OrderTracking.Application.Statuses.Models;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Application.Statuses.UpdateStatusDefinition;

public sealed record UpdateStatusDefinitionCommand(
    Guid Id,
    string Name,
    OrderItemType? ItemType,
    string? Color,
    string? DefaultCountry,
    string? DefaultLocation,
    int? PublishAfterDays,
    int SortOrder,
    bool IsActive,
    bool IsFinal) : IRequest<StatusDefinitionDto>;
