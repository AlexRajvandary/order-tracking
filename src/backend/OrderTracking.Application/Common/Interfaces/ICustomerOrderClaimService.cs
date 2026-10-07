namespace OrderTracking.Application.Common.Interfaces;

public interface ICustomerOrderClaimService
{
    Task<string> CreateAsync(Guid orderId, CancellationToken cancellationToken = default);
    Task ClaimAsync(Guid userId, string token, CancellationToken cancellationToken = default);
    Task NotifyRecentlyClaimedOrdersAsync(Guid userId, CancellationToken cancellationToken = default);
}

public interface ICustomerTelegramNotifier
{
    bool IsConfigured { get; }
    Task SendOrderCreatedAsync(Guid orderId, long telegramId, CancellationToken cancellationToken = default);
}
