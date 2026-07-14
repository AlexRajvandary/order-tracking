using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Audit;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Dashboard.GetDashboardSummary;

namespace OrderTracking.Application.Audit.GetAuditLogById;

public sealed class GetAuditLogByIdQueryHandler
    : IRequestHandler<GetAuditLogByIdQuery, AuditLogDetailsDto>
{
    private readonly IApplicationDbContext _context;

    public GetAuditLogByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<AuditLogDetailsDto> Handle(
        GetAuditLogByIdQuery request,
        CancellationToken cancellationToken)
    {
        var entry = await _context.AuditLogs
            .AsNoTracking()
            .Where(a => a.Id == request.Id)
            .Select(a => new
            {
                a.Id,
                a.EntityType,
                a.EntityId,
                a.Action,
                a.AdminUserId,
                AdminLogin = a.AdminUser != null ? a.AdminUser.Login : null,
                a.OldValues,
                a.NewValues,
                a.IpAddress,
                a.UserAgent,
                a.CorrelationId,
                a.CreatedAt,
            })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new KeyNotFoundException($"Audit log '{request.Id}' was not found");

        var canRestore = false;
        if (entry.Action == "DeleteOrder" && entry.EntityType == "Order")
        {
            canRestore = await _context.Orders
                .IgnoreQueryFilters()
                .AsNoTracking()
                .AnyAsync(o => o.Id == entry.EntityId && o.IsDeleted, cancellationToken);
        }

        var changes = AuditValueDiff.FromStoredJson(entry.OldValues, entry.NewValues)
            .Select(c => new AuditFieldChangeDto(c.Field, c.OldValue, c.NewValue))
            .ToList();

        return new AuditLogDetailsDto(
            entry.Id,
            entry.EntityType,
            entry.EntityId,
            entry.Action,
            entry.AdminUserId,
            entry.AdminLogin,
            entry.OldValues,
            entry.NewValues,
            entry.IpAddress,
            entry.UserAgent,
            entry.CorrelationId,
            entry.CreatedAt,
            canRestore,
            changes);
    }
}
