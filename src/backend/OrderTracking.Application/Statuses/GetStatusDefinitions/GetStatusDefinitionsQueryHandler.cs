using MediatR;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Common.Persistence.Models;
using OrderTracking.Application.Statuses.Models;

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
        var statuses = await _statusDefinitionRepository.ListAsync(
            new StatusDefinitionListCriteria(request.IncludeInactive),
            cancellationToken);

        return statuses
            .Select(s => new StatusDefinitionDto(
                s.Id,
                s.Name,
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
