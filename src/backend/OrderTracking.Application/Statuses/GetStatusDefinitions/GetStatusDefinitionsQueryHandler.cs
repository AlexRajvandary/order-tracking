using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Statuses.Models;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Application.Statuses.GetStatusDefinitions;

public sealed class GetStatusDefinitionsQueryHandler
    : IRequestHandler<GetStatusDefinitionsQuery, IReadOnlyList<StatusDefinitionDto>>
{
    private readonly IApplicationDbContext _context;

    public GetStatusDefinitionsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<StatusDefinitionDto>> Handle(
        GetStatusDefinitionsQuery request,
        CancellationToken cancellationToken)
    {
        var query = _context.StatusDefinitions.AsNoTracking();

        if (!request.IncludeInactive)
        {
            query = query.Where(s => s.IsActive);
        }

        if (!string.IsNullOrWhiteSpace(request.ItemType)
            && Enum.TryParse<OrderItemType>(request.ItemType, true, out var itemType))
        {
            query = query.Where(s => s.ItemType == null || s.ItemType == itemType);
        }

        return await query
            .OrderBy(s => s.Name)
            .Select(s => new StatusDefinitionDto(
                s.Id,
                s.Name,
                s.ItemType.HasValue ? s.ItemType.Value.ToString() : null,
                s.Color,
                s.DefaultCountry,
                s.DefaultLocation,
                s.PublishAfterDays,
                s.SortOrder,
                s.IsActive,
                s.IsFinal,
                s.CreatedAt))
            .ToListAsync(cancellationToken);
    }
}
