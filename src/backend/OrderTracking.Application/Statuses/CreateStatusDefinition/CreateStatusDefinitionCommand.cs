using MediatR;
using OrderTracking.Application.Statuses.Models;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Application.Statuses.CreateStatusDefinition;

public sealed record CreateStatusDefinitionCommand(
    string Name,
    OrderItemType? ItemType,
    string? Color,
    string? DefaultCountry,
    string? DefaultLocation,
    int? PublishAfterDays,
    int SortOrder,
    bool IsFinal) : IRequest<StatusDefinitionDto>;
