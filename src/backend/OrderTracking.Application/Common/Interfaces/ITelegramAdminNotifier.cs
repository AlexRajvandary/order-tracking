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
}