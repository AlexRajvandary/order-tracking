namespace OrderTracking.Application.Common.Interfaces;

public interface ITelegramAdminNotifier
{
    public bool IsEnabled { get; }

    public Task NotifyOrderCreatedAsync(
        Guid orderId,
        string trackingCode,
        string? customerName,
        CancellationToken cancellationToken = default);

    public Task NotifyStatusPublishedAsync(
        Guid orderId,
        string trackingCode,
        string statusText,
        string? orderItemName,
        string? country,
        string? location,
        Guid statusHistoryId,
        CancellationToken cancellationToken = default);

    public Task NotifyProductImportCompletedAsync(
        Guid importId,
        int insertedCount,
        CancellationToken cancellationToken = default);

    public Task NotifyCrawlerJobStartedAsync(
        Guid jobId,
        string url,
        string category,
        CancellationToken cancellationToken = default);

    public Task NotifyCrawlerJobFinishedAsync(
        Guid jobId,
        int insertedCount,
        string category,
        CancellationToken cancellationToken = default);
}
