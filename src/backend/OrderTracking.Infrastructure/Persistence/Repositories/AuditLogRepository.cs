using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Common.Persistence.Models;
using OrderTracking.Domain.Entities;

namespace OrderTracking.Infrastructure.Persistence.Repositories;

public sealed class AuditLogRepository : IAuditLogRepository
{
    private readonly ApplicationDbContext _db;

    public AuditLogRepository(ApplicationDbContext db)
    {
        _db = db;
    }

    public void Add(AuditLogEntry entry) => _db.AuditLogs.Add(entry);

    public Task<AuditLogDetailRow?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _db.AuditLogs
            .AsNoTracking()
            .Where(a => a.Id == id)
            .Select(a => new AuditLogDetailRow(
                a.Id,
                a.EntityType,
                a.EntityId,
                a.Action,
                a.AdminUserId,
                a.AdminUser != null ? a.AdminUser.Login : null,
                a.OldValues,
                a.NewValues,
                a.IpAddress,
                a.UserAgent,
                a.CorrelationId,
                a.CreatedAt))
            .FirstOrDefaultAsync(cancellationToken);

    public Task<bool> IsDeletedOrderRestorableAsync(Guid orderId, CancellationToken cancellationToken = default) =>
        _db.Orders
            .IgnoreQueryFilters()
            .AsNoTracking()
            .AnyAsync(o => o.Id == orderId && o.IsDeleted, cancellationToken);

    public async Task<IReadOnlyList<AuditLogRecentRow>> GetRecentForDashboardAsync(
        int take,
        CancellationToken cancellationToken = default) =>
        await _db.AuditLogs
            .AsNoTracking()
            .OrderByDescending(a => a.CreatedAt)
            .Take(take)
            .Select(a => new AuditLogRecentRow(
                a.Id,
                a.EntityType,
                a.EntityId,
                a.Action,
                a.AdminUser != null ? a.AdminUser.Login : null,
                a.CreatedAt,
                a.OldValues,
                a.NewValues))
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Guid>> GetRestorableDeletedOrderIdsAsync(
        IReadOnlyList<Guid> orderIds,
        CancellationToken cancellationToken = default)
    {
        if (orderIds.Count == 0)
        {
            return [];
        }

        return await _db.Orders
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(o => orderIds.Contains(o.Id) && o.IsDeleted)
            .Select(o => o.Id)
            .ToListAsync(cancellationToken);
    }
}
