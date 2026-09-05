using OrderTracking.Application.Orders.CreatePublicServiceRequest;

namespace OrderTracking.Api.Controllers;

internal static class PublicServiceRequestUploadMapper
{
    public const long MaxRequestBytes =
        CreatePublicServiceRequestCommandValidator.MaxImageCount
        * CreatePublicServiceRequestCommandValidator.MaxImageBytes
        + 1_048_576;

    public static IReadOnlyList<ServiceRequestImageUpload> Map(IReadOnlyList<IFormFile>? images)
    {
        if (images is not { Count: > 0 })
        {
            return [];
        }

        if (images.Count > CreatePublicServiceRequestCommandValidator.MaxImageCount)
        {
            throw new BadHttpRequestException(
                $"Можно прикрепить не более {CreatePublicServiceRequestCommandValidator.MaxImageCount} изображений.");
        }

        var uploads = new List<ServiceRequestImageUpload>(images.Count);

        try
        {
            foreach (var image in images)
            {
                if (image.Length <= 0
                    || image.Length > CreatePublicServiceRequestCommandValidator.MaxImageBytes)
                {
                    throw new BadHttpRequestException("Размер каждого изображения должен быть от 1 байта до 10 МБ.");
                }

                uploads.Add(new ServiceRequestImageUpload(
                    image.OpenReadStream(),
                    image.FileName,
                    image.ContentType,
                    image.Length));
            }

            return uploads;
        }
        catch
        {
            foreach (var upload in uploads)
            {
                upload.Content.Dispose();
            }

            throw;
        }
    }
}
