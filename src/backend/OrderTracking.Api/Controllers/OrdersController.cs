using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderTracking.Application.Common.Models;
using OrderTracking.Application.Orders.AddOrderItem;
using OrderTracking.Application.Orders.AiParse;
using OrderTracking.Application.Orders.CreateOrder;
using OrderTracking.Application.Orders.DeleteOrder;
using OrderTracking.Application.Orders.DeleteOrderItem;
using OrderTracking.Application.Orders.GetOrderById;
using OrderTracking.Application.Orders.GetOrders;
using OrderTracking.Application.Orders.GetOrderQrCode;
using OrderTracking.Application.Orders.GetOrderTrackingLink;
using OrderTracking.Application.Orders.Models;
using OrderTracking.Application.Orders.SearchOrders;
using OrderTracking.Application.Orders.RestoreOrder;
using OrderTracking.Application.Orders.UpdateOrder;
using OrderTracking.Application.Orders.UpdateOrderStatus;
using OrderTracking.Application.Orders.UpdateOrderItem;
using OrderTracking.Application.Orders.AddStatusHistoryPhotos;
using OrderTracking.Application.Orders.CancelScheduledStatusHistory;
using OrderTracking.Application.Orders.DeleteStatusHistoryPhoto;
using OrderTracking.Application.Orders.GetOrderStatusHistory;
using OrderTracking.Application.Orders.StatusPhotos;
using OrderTracking.Application.Orders.UpdateOrderItemStatus;
using OrderTracking.Application.Orders.UpdateOrderItemStatusHistory;
using OrderTracking.Application.Statuses.Models;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Api.Controllers;

[ApiController]
[Route("api/v1/orders")]
[Authorize]
public sealed class OrdersController : ControllerBase
{
    private readonly IMediator _mediator;

    public OrdersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<ActionResult<PaginatedList<OrderListItemDto>>> GetOrders(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new GetOrdersQuery(page, pageSize), cancellationToken);
        return Ok(result);
    }

    [HttpGet("search")]
    public async Task<ActionResult<PaginatedList<OrderListItemDto>>> SearchOrders(
        [FromQuery] string? q,
        [FromQuery] string? trackingCode,
        [FromQuery] string? customerName,
        [FromQuery] string? phone,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(
            new SearchOrdersQuery(q, trackingCode, customerName, phone, page, pageSize),
            cancellationToken);

        return Ok(result);
    }

    [HttpPost]
    [AllowAnonymous]
    public async Task<ActionResult<OrderDetailsDto>> CreateOrder(
        [FromBody] CreateOrderRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new CreateOrderCommand(
                request.CustomerId,
                request.NewCustomer,
                request.AdminNotes,
                request.DeliveryAddressId,
                request.DeliveryAddress,
                request.Items),
            cancellationToken);

        return CreatedAtAction(nameof(GetOrderById), new { id = result.Id }, result);
    }

    /// <summary>
    /// AI-assisted parse of free-form text and/or screenshot into an order draft.
    /// Does not create an order — result is for autofilling the create form.
    /// </summary>
    [HttpPost("ai/parse")]
    [RequestSizeLimit(AiOrderParseLimits.MaxImageBytes + 1_048_576)]
    [RequestFormLimits(MultipartBodyLengthLimit = AiOrderParseLimits.MaxImageBytes + 1_048_576)]
    public async Task<ActionResult<AiOrderDraft>> ParseOrderWithAi(
        [FromForm] string? text,
        IFormFile? image,
        CancellationToken cancellationToken)
    {
        Stream? imageStream = null;
        string? contentType = null;
        string? fileName = null;
        long? length = null;

        if (image is { Length: > 0 })
        {
            imageStream = image.OpenReadStream();
            contentType = image.ContentType;
            // Filename is untrusted — used only for diagnostics in validator context, never for storage path.
            fileName = Path.GetFileName(image.FileName);
            length = image.Length;
        }

        await using (imageStream)
        {
            var result = await _mediator.Send(
                new ParseOrderWithAiCommand(text, imageStream, contentType, fileName, length),
                cancellationToken);

            return Ok(result);
        }
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<OrderDetailsDto>> GetOrderById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetOrderByIdQuery(id), cancellationToken);
        return Ok(result);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<OrderDetailsDto>> UpdateOrder(
        Guid id,
        [FromBody] UpdateOrderRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new UpdateOrderCommand(
                id,
                request.CustomerId,
                request.AdminNotes,
                request.ExpectedDeliveryAt,
                request.CreatedAt),
            cancellationToken);

        return Ok(result);
    }

    [HttpPatch("{id:guid}/status")]
    public async Task<ActionResult<OrderDetailsDto>> UpdateOrderStatus(
        Guid id,
        [FromBody] UpdateOrderStatusRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new UpdateOrderStatusCommand(id, request.Status),
            cancellationToken);

        return Ok(result);
    }

    [HttpPost("{id:guid}/restore")]
    public async Task<ActionResult<OrderDetailsDto>> RestoreOrder(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new RestoreOrderCommand(id), cancellationToken);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteOrder(Guid id, CancellationToken cancellationToken)
    {
        await _mediator.Send(new DeleteOrderCommand(id), cancellationToken);
        return NoContent();
    }

    [HttpGet("{id:guid}/tracking-link")]
    public async Task<ActionResult<TrackingLinkDto>> GetTrackingLink(Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetOrderTrackingLinkQuery(id), cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}/qr")]
    public async Task<IActionResult> GetOrderQrCode(Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetOrderQrCodeQuery(id), cancellationToken);
        return File(result.PngBytes, "image/png", result.FileName);
    }

    [HttpPost("{orderId:guid}/items")]
    public async Task<ActionResult<OrderItemDto>> AddOrderItem(
        Guid orderId,
        [FromBody] UpsertOrderItemRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new AddOrderItemCommand(
                orderId,
                request.ItemType,
                request.Name,
                request.Description,
                request.Quantity,
                request.UnitPrice,
                request.CurrencyCode),
            cancellationToken);

        return CreatedAtAction(nameof(GetOrderById), new { id = orderId }, result);
    }

    [HttpPut("{orderId:guid}/items/{itemId:guid}")]
    public async Task<ActionResult<OrderItemDto>> UpdateOrderItem(
        Guid orderId,
        Guid itemId,
        [FromBody] UpsertOrderItemRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new UpdateOrderItemCommand(
                orderId,
                itemId,
                request.ItemType,
                request.Name,
                request.Description,
                request.Quantity,
                request.UnitPrice,
                request.CurrencyCode),
            cancellationToken);

        return Ok(result);
    }

    [HttpDelete("{orderId:guid}/items/{itemId:guid}")]
    public async Task<IActionResult> DeleteOrderItem(
        Guid orderId,
        Guid itemId,
        CancellationToken cancellationToken)
    {
        await _mediator.Send(new DeleteOrderItemCommand(orderId, itemId), cancellationToken);
        return NoContent();
    }

    [HttpPatch("{orderId:guid}/items/{itemId:guid}/status")]
    [RequestSizeLimit(52_428_800)]
    [RequestFormLimits(MultipartBodyLengthLimit = 52_428_800)]
    public async Task<ActionResult<OrderItemDto>> UpdateOrderItemStatus(
        Guid orderId,
        Guid itemId,
        CancellationToken cancellationToken)
    {
        Guid? statusDefinitionId;
        string? customStatusText;
        string? comment;
        string? country = null;
        string? location = null;
        DateTimeOffset? publishAt = null;
        IReadOnlyList<StatusPhotoUploadFile>? photos = null;

        if (Request.HasFormContentType)
        {
            var form = await Request.ReadFormAsync(cancellationToken);
            statusDefinitionId = Guid.TryParse(form["statusDefinitionId"], out var sid) ? sid : null;
            customStatusText = form["customStatusText"].FirstOrDefault();
            comment = form["comment"].FirstOrDefault();
            country = form["country"].FirstOrDefault();
            location = form["location"].FirstOrDefault();
            if (DateTimeOffset.TryParse(form["publishAt"].FirstOrDefault(), out var parsedPublishAt))
            {
                publishAt = parsedPublishAt;
            }

            var uploads = new List<StatusPhotoUploadFile>();
            foreach (var file in form.Files.Where(f =>
                         f.Name.Equals("photos", StringComparison.OrdinalIgnoreCase)
                         || f.Name.StartsWith("photos", StringComparison.OrdinalIgnoreCase)))
            {
                if (file.Length <= 0)
                {
                    continue;
                }

                var memory = new MemoryStream();
                await file.CopyToAsync(memory, cancellationToken);
                memory.Position = 0;
                uploads.Add(new StatusPhotoUploadFile(memory, file.FileName, file.ContentType));
            }

            photos = uploads;
        }
        else
        {
            var request = await HttpContext.Request.ReadFromJsonAsync<UpdateOrderItemStatusRequest>(
                cancellationToken: cancellationToken)
                ?? throw new BadHttpRequestException("Request body is required");

            statusDefinitionId = request.StatusDefinitionId;
            customStatusText = request.CustomStatusText;
            comment = request.Comment;
            country = request.Country;
            location = request.Location;
            publishAt = request.PublishAt;
        }

        var result = await _mediator.Send(
            new UpdateOrderItemStatusCommand(
                orderId,
                itemId,
                statusDefinitionId,
                customStatusText,
                comment,
                country,
                location,
                publishAt,
                photos),
            cancellationToken);

        return Ok(result);
    }

    [HttpPatch("{orderId:guid}/status-history/{historyId:guid}")]
    public async Task<ActionResult<StatusHistoryEntryDto>> UpdateStatusHistory(
        Guid orderId,
        Guid historyId,
        [FromBody] UpdateOrderItemStatusHistoryRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new UpdateOrderItemStatusHistoryCommand(
                orderId,
                historyId,
                request.StatusText,
                request.Comment,
                request.Country,
                request.Location,
                request.PublishAt),
            cancellationToken);

        return Ok(result);
    }

    [HttpDelete("{orderId:guid}/status-history/{historyId:guid}")]
    public async Task<IActionResult> CancelScheduledStatusHistory(
        Guid orderId,
        Guid historyId,
        CancellationToken cancellationToken)
    {
        await _mediator.Send(
            new CancelScheduledStatusHistoryCommand(orderId, historyId),
            cancellationToken);

        return NoContent();
    }

    [HttpPost("{orderId:guid}/status-history/{historyId:guid}/photos")]
    [RequestSizeLimit(52_428_800)]
    [RequestFormLimits(MultipartBodyLengthLimit = 52_428_800)]
    public async Task<ActionResult<IReadOnlyList<StatusHistoryAttachmentDto>>> AddStatusHistoryPhotos(
        Guid orderId,
        Guid historyId,
        CancellationToken cancellationToken)
    {
        var form = await Request.ReadFormAsync(cancellationToken);
        var uploads = new List<StatusPhotoUploadFile>();

        foreach (var file in form.Files.Where(f =>
                     f.Name.Equals("photos", StringComparison.OrdinalIgnoreCase)
                     || f.Name.StartsWith("photos", StringComparison.OrdinalIgnoreCase)))
        {
            if (file.Length <= 0)
            {
                continue;
            }

            var memory = new MemoryStream();
            await file.CopyToAsync(memory, cancellationToken);
            memory.Position = 0;
            uploads.Add(new StatusPhotoUploadFile(memory, file.FileName, file.ContentType));
        }

        var result = await _mediator.Send(
            new AddStatusHistoryPhotosCommand(orderId, historyId, uploads),
            cancellationToken);

        return Ok(result);
    }

    [HttpDelete("{orderId:guid}/status-history/{historyId:guid}/photos/{attachmentId:guid}")]
    public async Task<IActionResult> DeleteStatusHistoryPhoto(
        Guid orderId,
        Guid historyId,
        Guid attachmentId,
        CancellationToken cancellationToken)
    {
        await _mediator.Send(
            new DeleteStatusHistoryPhotoCommand(orderId, historyId, attachmentId),
            cancellationToken);

        return NoContent();
    }

    [HttpGet("{id:guid}/status-history")]
    public async Task<ActionResult<IReadOnlyList<StatusHistoryEntryDto>>> GetOrderStatusHistory(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetOrderStatusHistoryQuery(id), cancellationToken);
        return Ok(result);
    }
}

public sealed record CreateOrderRequest(
    Guid? CustomerId,
    CreateOrderNewCustomerDto? NewCustomer,
    string? AdminNotes,
    Guid? DeliveryAddressId,
    CreateOrderDeliveryAddressDto? DeliveryAddress,
    IReadOnlyList<CreateOrderItemDto>? Items);

public sealed record UpdateOrderRequest(
    Guid? CustomerId,
    string? AdminNotes,
    DateTimeOffset? ExpectedDeliveryAt,
    DateTimeOffset? CreatedAt = null);

public sealed record UpdateOrderStatusRequest(OrderStatus Status);

public sealed record UpsertOrderItemRequest(
    OrderItemType ItemType,
    string Name,
    string? Description,
    int Quantity = 1,
    decimal? UnitPrice = null,
    string? CurrencyCode = null);

public sealed record UpdateOrderItemStatusRequest(
    Guid? StatusDefinitionId,
    string? CustomStatusText,
    string? Comment,
    string? Country = null,
    string? Location = null,
    DateTimeOffset? PublishAt = null);

public sealed record UpdateOrderItemStatusHistoryRequest(
    string? StatusText,
    string? Comment,
    string? Country,
    string? Location,
    DateTimeOffset? PublishAt);
