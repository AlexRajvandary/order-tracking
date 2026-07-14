using MediatR;
using OrderTracking.Application.Dashboard.GetDashboardSummary;

namespace OrderTracking.Application.Audit.GetAuditLogById;

public sealed record GetAuditLogByIdQuery(Guid Id) : IRequest<AuditLogDetailsDto>;

public sealed record AuditLogDetailsDto(
    Guid Id,
    string EntityType,
    Guid EntityId,
    string Action,
    Guid? AdminUserId,
    string? AdminLogin,
    string? OldValues,
    string? NewValues,
    string? IpAddress,
    string? UserAgent,
    string? CorrelationId,
    DateTimeOffset CreatedAt,
    bool CanRestore,
    IReadOnlyList<AuditFieldChangeDto> Changes);
