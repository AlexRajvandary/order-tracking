using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Infrastructure.Persistence;

namespace OrderTracking.Infrastructure.ProductPreviews;

public sealed class ProductPreviewBackgroundService(
    ProductPreviewQueue queue,
    IServiceScopeFactory scopeFactory,
    ILogger<ProductPreviewBackgroundService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var workItem in queue.ReadAllAsync(stoppingToken))
        {
            try
            {
                await ProcessAsync(workItem, stoppingToken);
            }
            catch (Exception exception) when (!stoppingToken.IsCancellationRequested)
            {
                logger.LogWarning(exception, "Product preview job failed for order item {OrderItemId}", workItem.OrderItemId);
            }
            finally
            {
                queue.Complete(workItem);
            }
        }
    }

    private async Task ProcessAsync(ProductPreviewWorkItem workItem, CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var extractor = scope.ServiceProvider.GetRequiredService<ProductPreviewExtractor>();
        var storage = scope.ServiceProvider.GetRequiredService<IObjectStorage>();
        var item = await db.OrderItems.Include(value => value.Procurement)
            .FirstOrDefaultAsync(value => value.Id == workItem.OrderItemId, cancellationToken);
        if (item is null || item.ManualImageObjectKey is not null || !CurrentSourceUrl(item).Equals(workItem.SourceUrl, StringComparison.Ordinal))
        {
            return;
        }

        var preview = await extractor.ExtractAsync(workItem.SourceUrl, cancellationToken);
        if (preview is null)
        {
            return;
        }

        await db.Entry(item).ReloadAsync(cancellationToken);
        await db.Entry(item).Reference(value => value.Procurement).LoadAsync(cancellationToken);
        if (item.ManualImageObjectKey is not null || !CurrentSourceUrl(item).Equals(workItem.SourceUrl, StringComparison.Ordinal))
        {
            return;
        }

        var oldObjectKey = item.PreviewImageObjectKey;
        var objectKey = $"order-items/{item.Id}/preview/{Guid.NewGuid():N}{preview.Extension}";
        await using var content = new MemoryStream(preview.Content);
        await storage.PutAsync(objectKey, content, preview.ContentType, cancellationToken);

        await db.Entry(item).ReloadAsync(cancellationToken);
        await db.Entry(item).Reference(value => value.Procurement).LoadAsync(cancellationToken);
        if (item.ManualImageObjectKey is not null || !CurrentSourceUrl(item).Equals(workItem.SourceUrl, StringComparison.Ordinal))
        {
            try
            {
                await storage.DeleteAsync(objectKey, cancellationToken);
            }
            catch (Exception exception)
            {
                logger.LogWarning(exception, "Could not delete unused product preview {ObjectKey}", objectKey);
            }
            return;
        }

        item.PreviewImageObjectKey = objectKey;
        item.PreviewImageContentType = preview.ContentType;
        item.PreviewImageSource = preview.Source;
        item.PreviewSourceUrl = workItem.SourceUrl;
        item.PreviewFetchedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        if (oldObjectKey is not null && !oldObjectKey.Equals(objectKey, StringComparison.Ordinal))
        {
            try
            {
                await storage.DeleteAsync(oldObjectKey, cancellationToken);
            }
            catch (Exception exception)
            {
                logger.LogWarning(exception, "Could not delete stale product preview {ObjectKey}", oldObjectKey);
            }
        }
    }

    private static string CurrentSourceUrl(OrderTracking.Domain.Entities.OrderItem item) =>
        item.Procurement?.PurchaseUrl?.Trim() ?? item.SourceUrl?.Trim() ?? string.Empty;
}
