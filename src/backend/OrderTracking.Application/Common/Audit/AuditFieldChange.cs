namespace OrderTracking.Application.Common.Audit;

public sealed record AuditFieldChange(
    string Field,
    string? OldValue,
    string? NewValue);
