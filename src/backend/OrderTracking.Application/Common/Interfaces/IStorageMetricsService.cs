using OrderTracking.Application.Monitoring.Models;

namespace OrderTracking.Application.Common.Interfaces;

public interface IStorageMetricsService
{
    Task<StorageMetricsDto> GetMetricsAsync(CancellationToken cancellationToken);
}
