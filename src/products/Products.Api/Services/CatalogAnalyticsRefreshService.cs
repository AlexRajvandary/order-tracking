using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Products.Api.Services;

public sealed class CatalogAnalyticsRefreshService(
    IServiceScopeFactory scopeFactory,
    ILogger<CatalogAnalyticsRefreshService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await RefreshAsync(force: false, stoppingToken);
        using var timer = new PeriodicTimer(TimeSpan.FromDays(1));
        while (await timer.WaitForNextTickAsync(stoppingToken))
            await RefreshAsync(force: true, stoppingToken);
    }

    private async Task RefreshAsync(bool force, CancellationToken cancellationToken)
    {
        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var analytics = scope.ServiceProvider.GetRequiredService<CatalogAnalyticsCacheService>();
            await analytics.RefreshAsync(force, cancellationToken);
            logger.LogInformation("Catalog analytics cache is up to date");
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // The host is stopping.
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Failed to refresh catalog analytics cache");
        }
    }
}
