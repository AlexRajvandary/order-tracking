using MediatR;
using OrderTracking.Application.Common.Audit;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Dashboard.GetDashboardSummary;

namespace OrderTracking.Application.Audit.GetAuditLogById;

public sealed class GetAuditLogByIdQueryHandler
    : IRequestHandler<GetAuditLogByIdQuery, AuditLogDetailsDto>
{
    private readonly IAuditLogRepository _auditLogRepository;

    public GetAuditLogByIdQueryHandler(IAuditLogRepository auditLogRepository)
    {
        _auditLogRepository = auditLogRepository;
    }

    public async Task<AuditLogDetailsDto> Handle(
        GetAuditLogByIdQuery request,
        CancellationToken cancellationToken)
    {
        var entry = await _auditLogRepository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new KeyNotFoundException($"Audit log '{request.Id}' was not found");

        var canRestore = false;
        if (entry.Action == "DeleteOrder" && entry.EntityType == "Order")
        {
            canRestore = await _auditLogRepository
                .IsDeletedOrderRestorableAsync(entry.EntityId, cancellationToken);
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
