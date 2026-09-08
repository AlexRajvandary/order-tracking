using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Products.Domain.Enums;
using Products.Infrastructure.Persistence;

namespace Products.Infrastructure.Services;

internal sealed class ProductImageImportHostedService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ProductImageStorage _storage;
    private readonly ILogger<ProductImageImportHostedService> _logger;

    public ProductImageImportHostedService(
        IServiceScopeFactory scopeFactory,
        ProductImageStorage storage,
        ILogger<ProductImageImportHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _storage = storage;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var worked = await ProcessNextAsync(stoppingToken);
                if (!worked) await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Product image import worker iteration failed");
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }
        }
    }

    private async Task<bool> ProcessNextAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ProductsDbContext>();
        var job = await db.ImageImportJobs
            .OrderBy(x => x.CreatedAt)
            .FirstOrDefaultAsync(x => x.Status == ImageImportJobStatus.Pending
                || x.Status == ImageImportJobStatus.Running
                || x.Status == ImageImportJobStatus.PauseRequested
                || x.Status == ImageImportJobStatus.CancelRequested, cancellationToken);
        if (job is null) return false;

        var now = DateTimeOffset.UtcNow;
        if (job.Status == ImageImportJobStatus.PauseRequested)
        {
            job.Status = ImageImportJobStatus.Paused;
            job.UpdatedAt = now;
            await db.SaveChangesAsync(cancellationToken);
            return true;
        }
        if (job.Status == ImageImportJobStatus.CancelRequested)
        {
            job.Status = ImageImportJobStatus.Cancelled;
            job.CompletedAt = now;
            job.UpdatedAt = now;
            await db.SaveChangesAsync(cancellationToken);
            return true;
        }
        if (job.Status == ImageImportJobStatus.Pending)
        {
            job.Status = ImageImportJobStatus.Running;
            job.StartedAt = now;
            job.UpdatedAt = now;
            await db.SaveChangesAsync(cancellationToken);
        }

        var items = await db.ImageImportJobItems
            .Where(x => x.JobId == job.Id && !x.Completed && !x.Failed)
            .Include(x => x.Product)
            .Take(job.Parallelism)
            .ToListAsync(cancellationToken);
        if (items.Count == 0)
        {
            job.Status = job.FailedItems > 0 ? ImageImportJobStatus.CompletedWithErrors : ImageImportJobStatus.Completed;
            job.CompletedAt = now;
            job.UpdatedAt = now;
            await db.SaveChangesAsync(cancellationToken);
            return true;
        }

        var results = await Task.WhenAll(items.Select(async item =>
        {
            try
            {
                var stored = await _storage.DownloadAndStoreAsync(item.ProductId, item.Product.ImageUrl, cancellationToken);
                return (item.Id, Stored: stored, Error: (string?)null);
            }
            catch (Exception ex) when (ex is HttpRequestException or InvalidOperationException or TaskCanceledException)
            {
                return (item.Id, Stored: (StoredProductImage?)null, Error: ex.Message);
            }
        }));

        foreach (var result in results)
        {
            var item = items.Single(x => x.Id == result.Id);
            item.CompletedAt = DateTimeOffset.UtcNow;
            if (result.Stored is not null)
            {
                item.Completed = true;
                item.Product.LocalImageUrl = result.Stored.PublicUrl;
                job.SucceededItems++;
                job.ImportedBytes += result.Stored.SizeBytes;
            }
            else
            {
                item.Failed = true;
                item.Error = result.Error;
                job.FailedItems++;
                job.LastError = result.Error;
            }
            job.ProcessedItems++;
        }
        job.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }
}
