using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Infrastructure.Persistence;
using OrderTracking.Infrastructure.ProductPreviews;

namespace OrderTracking.Api.Controllers;

[ApiController]
[Route("api/v1/order-items")]
[Authorize(Roles = "Buyer,Moderator,Admin,SuperAdmin")]
public sealed class OrderItemImagesController(
    ApplicationDbContext db,
    IObjectStorage objectStorage,
    IImageCompressor imageCompressor,
    ProductPreviewQueue previewQueue,
    ILogger<OrderItemImagesController> logger) : ControllerBase
{
    private const long MaxImageBytes = 10 * 1024 * 1024;
    private static readonly HashSet<string> AllowedContentTypes = new(
        ["image/jpeg", "image/png", "image/webp"],
        StringComparer.OrdinalIgnoreCase);

    [HttpGet("{itemId:guid}/image")]
    public async Task<IActionResult> GetImage(Guid itemId, CancellationToken cancellationToken)
    {
        var image = await db.OrderItems.AsNoTracking()
            .Where(value => value.Id == itemId)
            .Select(value => new
            {
                ObjectKey = value.ManualImageObjectKey ?? value.PreviewImageObjectKey,
                ContentType = value.ManualImageObjectKey != null
                    ? value.ManualImageContentType
                    : value.PreviewImageContentType,
            })
            .FirstOrDefaultAsync(cancellationToken);
        if (image?.ObjectKey is null)
        {
            return NotFound();
        }

        var stream = await objectStorage.GetAsync(image.ObjectKey, cancellationToken);
        return File(stream, image.ContentType ?? "image/webp", enableRangeProcessing: true);
    }

    [HttpPost("{itemId:guid}/image")]
    [RequestSizeLimit(MaxImageBytes + 1_048_576)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxImageBytes + 1_048_576)]
    public async Task<ActionResult<OrderItemImageDto>> UploadImage(
        Guid itemId,
        IFormFile file,
        CancellationToken cancellationToken)
    {
        var item = await db.OrderItems.FirstOrDefaultAsync(value => value.Id == itemId, cancellationToken);
        if (item is null)
        {
            return NotFound();
        }

        if (file.Length <= 0)
        {
            return BadRequest(new { detail = "Файл пуст." });
        }

        if (file.Length > MaxImageBytes)
        {
            return BadRequest(new { detail = "Размер изображения не должен превышать 10 МБ." });
        }

        if (!AllowedContentTypes.Contains(file.ContentType))
        {
            return BadRequest(new { detail = "Поддерживаются изображения JPEG, PNG и WebP." });
        }

        await using var source = file.OpenReadStream();
        var compressed = await imageCompressor.CompressAsync(source, file.ContentType, cancellationToken);
        if (compressed is null)
        {
            return BadRequest(new { detail = "Не удалось обработать изображение." });
        }

        await using var content = compressed.Value.Content;
        var objectKey = $"order-items/{item.Id}/manual/{Guid.NewGuid():N}{compressed.Value.Extension}";
        await objectStorage.PutAsync(objectKey, content, compressed.Value.ContentType, cancellationToken);

        var oldObjectKey = item.ManualImageObjectKey;
        try
        {
            item.ManualImageObjectKey = objectKey;
            item.ManualImageContentType = compressed.Value.ContentType;
            await db.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            await objectStorage.DeleteAsync(objectKey, CancellationToken.None);
            throw;
        }

        if (oldObjectKey is not null)
        {
            await TryDeleteAsync(oldObjectKey, cancellationToken);
        }

        return Ok(ToDto(item));
    }

    [HttpDelete("{itemId:guid}/image")]
    public async Task<ActionResult<OrderItemImageDto>> DeleteImage(
        Guid itemId,
        CancellationToken cancellationToken)
    {
        var item = await db.OrderItems.Include(value => value.Procurement)
            .FirstOrDefaultAsync(value => value.Id == itemId, cancellationToken);
        if (item is null)
        {
            return NotFound();
        }

        var oldObjectKey = item.ManualImageObjectKey;
        item.ManualImageObjectKey = null;
        item.ManualImageContentType = null;
        await db.SaveChangesAsync(cancellationToken);

        if (oldObjectKey is not null)
        {
            await TryDeleteAsync(oldObjectKey, cancellationToken);
        }

        if (item.PreviewImageObjectKey is null)
        {
            previewQueue.TryEnqueue(item.Id, CurrentSourceUrl(item));
        }

        return Ok(ToDto(item));
    }

    private async Task TryDeleteAsync(string objectKey, CancellationToken cancellationToken)
    {
        try
        {
            await objectStorage.DeleteAsync(objectKey, cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Could not delete stale order item image {ObjectKey}", objectKey);
        }
    }

    private static string? CurrentSourceUrl(OrderTracking.Domain.Entities.OrderItem item) =>
        item.Procurement?.PurchaseUrl?.Trim() ?? item.SourceUrl?.Trim();

    private static OrderItemImageDto ToDto(OrderTracking.Domain.Entities.OrderItem item) =>
        new(
            item.ManualImageObjectKey is not null
                ? $"/api/v1/order-items/{item.Id}/image"
                : item.ImageUrl ?? (item.PreviewImageObjectKey is not null ? $"/api/v1/order-items/{item.Id}/image" : null),
            item.ManualImageObjectKey is not null,
            item.PreviewImageObjectKey is not null,
            item.PreviewImageSource);
}

public sealed record OrderItemImageDto(
    string? PrimaryImageUrl,
    bool HasManualImage,
    bool HasPreviewImage,
    string? PreviewImageSource);
