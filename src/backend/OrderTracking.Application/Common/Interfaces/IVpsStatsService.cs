using OrderTracking.Application.Monitoring.Models;

namespace OrderTracking.Application.Common.Interfaces;

public interface IVpsStatsService
{
    Task<VpsStatsDto> GetAsync(
        string field,
        DateTimeOffset start,
        DateTimeOffset end,
        CancellationToken cancellationToken);
}
