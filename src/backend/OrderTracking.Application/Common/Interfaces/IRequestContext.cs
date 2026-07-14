namespace OrderTracking.Application.Common.Interfaces;

public interface IRequestContext
{
    string? CorrelationId { get; }
    string? IpAddress { get; }
    string? UserAgent { get; }
}
