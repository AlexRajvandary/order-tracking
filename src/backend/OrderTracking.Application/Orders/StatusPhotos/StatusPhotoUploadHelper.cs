using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Domain.Entities;

namespace OrderTracking.Application.Orders.StatusPhotos;

public static class StatusPhotoUploadHelper
{
    public const int MaxPhotosPerRequest = 5;

    public static async Task<IReadOnlyList<OrderItemStatusAttachment>> UploadAsync(
        IOrderRepository orderRepository,
        IObjectStorage objectStorage,
        IImageCompressor imageCompressor,
        Guid orderId,
        Guid historyId,
        Guid adminId,
        DateTimeOffset uploadedAt,
        int startingSortOrder,
        IReadOnlyList<StatusPhotoUploadFile> photos,
        CancellationToken cancellationToken)
    {
        var attachments = new List<OrderItemStatusAttachment>();
        var stamp = uploadedAt.ToString("yyyyMMddHHmmss");
        var sortOrder = startingSortOrder;

        foreach (var photo in photos)
        {
            await using var source = photo.Content;
            var compressed = await imageCompressor.CompressAsync(
                source,
                photo.ContentType,
                cancellationToken);

            if (compressed is null)
            {
                throw new InvalidOperationException(
                    $"File '{photo.FileName ?? "upload"}' is not a supported image");
            }

            var (content, contentType, extension) = compressed.Value;
            await using (content)
            {
                var size = content.CanSeek ? content.Length : 0;
                if (content.CanSeek)
                {
                    content.Position = 0;
                }

                var objectKey =
                    $"orderStatusesAttachments/{orderId}/{stamp}_{sortOrder:D2}{extension}";

                await objectStorage.PutAsync(objectKey, content, contentType, cancellationToken);

                var attachment = new OrderItemStatusAttachment
                {
                    Id = Guid.NewGuid(),
                    StatusHistoryId = historyId,
                    ObjectKey = objectKey,
                    ContentType = contentType,
                    OriginalFileName = photo.FileName,
                    SizeBytes = size,
                    SortOrder = sortOrder,
                    UploadedByAdminId = adminId,
                    UploadedAt = uploadedAt,
                };

                orderRepository.AddAttachment(attachment);
                attachments.Add(attachment);
            }

            sortOrder++;
        }

        return attachments;
    }
}

public sealed record StatusPhotoUploadFile(
    Stream Content,
    string? FileName,
    string? ContentType);
