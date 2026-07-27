using MediatR;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Common.Persistence.Models;
using OrderTracking.Application.Statuses.Models;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Application.Statuses.GetStatusDefinitions;

public sealed class GetStatusDefinitionsQueryHandler
    : IRequestHandler<GetStatusDefinitionsQuery, IReadOnlyList<StatusDefinitionDto>>
{
    private readonly IStatusDefinitionRepository _statusDefinitionRepository;

    public GetStatusDefinitionsQueryHandler(IStatusDefinitionRepository statusDefinitionRepository)
    {
        _statusDefinitionRepository = statusDefinitionRepository;
    }

    public async Task<IReadOnlyList<StatusDefinitionDto>> Handle(
        GetStatusDefinitionsQuery request,
        CancellationToken cancellationToken)
    {
        var itemType = !string.IsNullOrWhiteSpace(request.ItemType)
            && Enum.TryParse<OrderItemType>(request.ItemType, true, out var parsedItemType)
                ? parsedItemType
                : (OrderItemType?)null;

        var statuses = await _statusDefinitionRepository.ListAsync(
            new StatusDefinitionListCriteria(request.IncludeInactive, itemType),
            cancellationToken);

        return statuses
            .Select(s => new StatusDefinitionDto(
                s.Id,
                s.Name,
                s.ItemType,
                s.Color,
                s.DefaultCountry,
                s.DefaultLocation,
                s.PublishAfterDays,
                s.SortOrder,
                s.IsActive,
                s.IsFinal,
                s.CreatedAt))
            .ToList();
    }
}
