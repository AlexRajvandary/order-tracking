using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Domain.Entities;

namespace OrderTracking.Infrastructure.Services;

public sealed class AuditService : IAuditService
{
    private readonly IAuditLogRepository _auditLogs;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IRequestContext _requestContext;
    private readonly IDateTimeProvider _clock;

    public AuditService(
        IAuditLogRepository auditLogs,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUser,
        IRequestContext requestContext,
        IDateTimeProvider clock)
    {
        _auditLogs = auditLogs;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _requestContext = requestContext;
        _clock = clock;
    }

    public async Task WriteAsync(
        string entityType,
        Guid entityId,
        string action,
        string? oldValues,
        string? newValues,
        CancellationToken cancellationToken = default)
    {
        _auditLogs.Add(new AuditLogEntry
        {
            Id = Guid.NewGuid(),
            EntityType = entityType,
            EntityId = entityId,
            Action = action,
            AdminUserId = _currentUser.UserId,
            OldValues = oldValues,
            NewValues = newValues,
            IpAddress = _requestContext.IpAddress,
            UserAgent = Truncate(_requestContext.UserAgent, 512),
            CorrelationId = _requestContext.CorrelationId,
            CreatedAt = _clock.UtcNow,
        });

        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private static string? Truncate(string? value, int maxLength)
    {
        if (string.IsNullOrEmpty(value) || value.Length <= maxLength)
        {
            return value;
        }

        return value[..maxLength];
    }
}
