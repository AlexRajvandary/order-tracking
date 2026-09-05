using MediatR;
using Microsoft.Extensions.Configuration;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Orders.CreateOrder;
using OrderTracking.Application.Orders.Models;
using OrderTracking.Domain.Entities;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Application.Orders.CreatePublicServiceRequest;

public sealed class CreatePublicServiceRequestCommandHandler
    : IRequestHandler<CreatePublicServiceRequestCommand, OrderDetailsDto>
{
    private readonly IAdminUserRepository _adminUserRepository;

    private readonly IConfiguration _configuration;

    private readonly IMediator _mediator;

    private readonly IImageCompressor _imageCompressor;

    private readonly IObjectStorage _objectStorage;

    public CreatePublicServiceRequestCommandHandler(
        IAdminUserRepository adminUserRepository,
        IConfiguration configuration,
        IMediator mediator,
        IImageCompressor imageCompressor,
        IObjectStorage objectStorage)
    {
        _adminUserRepository = adminUserRepository;
        _configuration = configuration;
        _mediator = mediator;
        _imageCompressor = imageCompressor;
        _objectStorage = objectStorage;
    }

    public async Task<OrderDetailsDto> Handle(
        CreatePublicServiceRequestCommand request,
        CancellationToken cancellationToken)
    {
        var creator = await ResolveCreatorAsync(cancellationToken);
        var customer = CreateCustomer(request);
        var item = CreateItem(request);
        var orderId = Guid.NewGuid();
        var uploadedImages = await UploadImagesAsync(request, orderId, cancellationToken);

        try
        {
            return await _mediator.Send(
                new CreateOrderCommand(
                    null,
                    customer,
                    $"Заявка из формы: {GetRequestLabel(request.RequestType)}",
                    null,
                    null,
                    [item],
                    creator.Id,
                    orderId,
                    uploadedImages),
                cancellationToken);
        }
        catch
        {
            await DeleteUploadedImagesAsync(uploadedImages, CancellationToken.None);
            throw;
        }
    }

    private async Task<IReadOnlyList<TelegramImageAttachment>> UploadImagesAsync(
        CreatePublicServiceRequestCommand request,
        Guid orderId,
        CancellationToken cancellationToken)
    {
        if (request.Images is not { Count: > 0 })
        {
            return [];
        }

        var requestType = request.RequestType.ToString().ToLowerInvariant();
        var uploaded = new List<TelegramImageAttachment>(request.Images.Count);

        try
        {
            for (var index = 0; index < request.Images.Count; index++)
            {
                var image = request.Images[index];
                await using var source = image.Content;
                var compressed = await _imageCompressor.CompressAsync(
                    source,
                    image.ContentType,
                    cancellationToken);

                if (compressed is null)
                {
                    throw new InvalidOperationException(
                        $"File '{image.FileName ?? "upload"}' is not a supported image");
                }

                var (content, contentType, extension) = compressed.Value;
                await using (content)
                {
                    var objectKey =
                        $"service-requests/{requestType}/{orderId:D}/images/{index + 1:D2}-{Guid.NewGuid():N}{extension}";

                    await _objectStorage.PutAsync(
                        objectKey,
                        content,
                        contentType,
                        cancellationToken);

                    uploaded.Add(new TelegramImageAttachment(
                        objectKey,
                        BuildStoredFileName(image.FileName, index, extension),
                        contentType));
                }
            }

            return uploaded;
        }
        catch
        {
            await DeleteUploadedImagesAsync(uploaded, CancellationToken.None);
            throw;
        }
    }

    private async Task DeleteUploadedImagesAsync(
        IReadOnlyList<TelegramImageAttachment> images,
        CancellationToken cancellationToken)
    {
        foreach (var image in images)
        {
            try
            {
                await _objectStorage.DeleteAsync(image.ObjectKey, cancellationToken);
            }
            catch
            {
                // Preserve the original request failure; orphan cleanup can be retried operationally.
            }
        }
    }

    private static string BuildStoredFileName(string? originalFileName, int index, string extension)
    {
        var baseName = string.IsNullOrWhiteSpace(originalFileName)
            ? $"image-{index + 1}"
            : Path.GetFileNameWithoutExtension(originalFileName);

        return $"{baseName}{extension}";
    }

    private static CreateOrderNewCustomerDto CreateCustomer(
        CreatePublicServiceRequestCommand request)
    {
        var contactType = request.ContactType.Trim().ToLowerInvariant();
        var contact = request.Contact.Trim();

        return new CreateOrderNewCustomerDto(
            null,
            request.CustomerName.Trim(),
            null,
            contactType == "telegram" ? contact : null,
            contactType == "phone" ? contact : null,
            contactType == "whatsapp" ? contact : null,
            contactType == "vk" ? contact : null,
            null);
    }

    private static CreateOrderItemDto CreateItem(CreatePublicServiceRequestCommand request)
    {
        return request.RequestType switch
        {
            PublicServiceRequestType.Auction => new CreateOrderItemDto(
                OrderItemType.Product,
                "Аукционный лот",
                Normalize(request.Description),
                1,
                request.BudgetJpy,
                request.BudgetJpy.HasValue ? "JPY" : null,
                Normalize(request.SourceUrl)),
            PublicServiceRequestType.Ticket => new CreateOrderItemDto(
                OrderItemType.Service,
                Normalize(request.EventName) ?? "Запрос на билеты",
                BuildTicketDescription(request),
                request.Quantity,
                null,
                null,
                Normalize(request.SourceUrl)),
            _ => new CreateOrderItemDto(
                OrderItemType.Product,
                "Индивидуальный запрос",
                request.Description!.Trim(),
                1,
                null,
                null,
                Normalize(request.SourceUrl)),
        };
    }

    private static string? BuildTicketDescription(CreatePublicServiceRequestCommand request)
    {
        var details = new List<string>();

        AddDetail(details, "Дата", request.EventDate);
        AddDetail(details, "Город / место", request.Location);

        if (request.BudgetJpy.HasValue)
        {
            details.Add($"Бюджет: {request.BudgetJpy.Value:0.##} JPY");
        }

        AddDetail(details, "Комментарий", request.Description);

        return details.Count == 0 ? null : string.Join(Environment.NewLine, details);
    }

    private static void AddDetail(List<string> details, string label, string? value)
    {
        if (!string.IsNullOrWhiteSpace(value))
        {
            details.Add($"{label}: {value.Trim()}");
        }
    }

    private static string GetRequestLabel(PublicServiceRequestType requestType)
    {
        return requestType switch
        {
            PublicServiceRequestType.Auction => "Аукцион",
            PublicServiceRequestType.Ticket => "Билеты",
            _ => "Индивидуальный запрос",
        };
    }

    private async Task<AdminUser> ResolveCreatorAsync(CancellationToken cancellationToken)
    {
        var login = _configuration["PublicCheckout:CreatedByAdminLogin"]
            ?? _configuration["Seed:AdminLogin"]
            ?? "admin";

        var creator = await _adminUserRepository.GetByLoginAsync(login, cancellationToken);

        if (creator is null || !creator.IsActive)
        {
            throw new InvalidOperationException(
                $"Active public checkout admin '{login}' was not found");
        }

        return creator;
    }

    private static string? Normalize(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
