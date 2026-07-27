using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Common.Persistence.Models;
using OrderTracking.Domain.Entities;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Infrastructure.Persistence.Repositories;

public sealed class StatusDefinitionRepository : IStatusDefinitionRepository
{
    private readonly ApplicationDbContext _db;

    public StatusDefinitionRepository(ApplicationDbContext db)
    {
        _db = db;
    }

    public void Add(StatusDefinition status) => _db.StatusDefinitions.Add(status);

    public Task<StatusDefinition?> GetByIdTrackedAsync(Guid id, CancellationToken cancellationToken = default) =>
        _db.StatusDefinitions.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

    public Task<StatusDefinition?> GetActiveByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _db.StatusDefinitions.FirstOrDefaultAsync(s => s.Id == id && s.IsActive, cancellationToken);

    public async Task<IReadOnlyList<StatusDefinition>> GetScheduledForItemTypesAsync(
        IReadOnlyList<OrderItemType> itemTypes,
        CancellationToken cancellationToken = default) =>
        await _db.StatusDefinitions
            .AsNoTracking()
            .Where(s =>
                s.IsActive
                && s.PublishAfterDays != null
                && (s.ItemType == null || itemTypes.Contains(s.ItemType.Value)))
            .OrderBy(s => s.PublishAfterDays)
            .ThenBy(s => s.SortOrder)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<StatusDefinitionListRow>> ListAsync(
        StatusDefinitionListCriteria criteria,
        CancellationToken cancellationToken = default)
    {
        var query = _db.StatusDefinitions.AsNoTracking();

        if (!criteria.IncludeInactive)
        {
            query = query.Where(s => s.IsActive);
        }

        if (criteria.ItemType is { } itemType)
        {
            query = query.Where(s => s.ItemType == null || s.ItemType == itemType);
        }

        return await query
            .OrderBy(s => s.Name)
            .Select(s => new StatusDefinitionListRow(
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

    public async Task<StatusDefinitionAuditSnapshotRow?> GetAuditSnapshotAsync(
        Guid id,
        bool includeDeleted,
        CancellationToken cancellationToken = default)
    {
        var query = _db.StatusDefinitions.AsNoTracking();
        if (includeDeleted)
        {
            query = query.IgnoreQueryFilters();
        }

        return await query
            .Where(s => s.Id == id)
            .Select(s => new StatusDefinitionAuditSnapshotRow(
                s.Name,
                s.ItemType.HasValue ? s.ItemType.Value.ToString() : null,
                s.Color,
                s.IsActive,
                s.IsFinal,
                s.IsDeleted))
            .FirstOrDefaultAsync(cancellationToken);
    }
}
