using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Tracking.GetOrderByTrackingCode;
using OrderTracking.Application.Tracking.Models;
using OrderTracking.Infrastructure.Persistence;

namespace OrderTracking.Api.Controllers;

[ApiController]
[Route("api/v1/track")]
[AllowAnonymous]
public sealed class TrackingController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ApplicationDbContext _db;
    private readonly IObjectStorage _objectStorage;

    public TrackingController(IMediator mediator, ApplicationDbContext db, IObjectStorage objectStorage)
    {
        _mediator = mediator;
        _db = db;
        _objectStorage = objectStorage;
    }

    [HttpGet("{trackingCode}")]
    [EnableRateLimiting("tracking")]
    public async Task<ActionResult<PublicTrackingDto>> GetByTrackingCode(
        string trackingCode,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new GetOrderByTrackingCodeQuery(trackingCode.ToUpperInvariant()),
            cancellationToken);

        return Ok(result);
    }

    [HttpGet("{trackingCode}/items/{itemId:guid}/image")]
    [EnableRateLimiting("tracking")]
    public async Task<IActionResult> GetItemImage(
        string trackingCode,
        Guid itemId,
        CancellationToken cancellationToken)
    {
        var code = trackingCode.Trim().ToUpperInvariant();
        var workspaceOrderId = await _db.SalesOrders
            .AsNoTracking()
            .Where(order => order.SourceRequest.TrackingCode == code)
            .Select(order => (Guid?)order.WorkspaceRequestId)
            .FirstOrDefaultAsync(cancellationToken);

        var orderId = workspaceOrderId ?? await _db.Orders
            .AsNoTracking()
            .Where(order => order.TrackingCode == code && !order.IsSalesOrderWorkspace)
            .Select(order => (Guid?)order.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (orderId is null)
        {
            return NotFound();
        }

        var image = await _db.OrderItems
            .AsNoTracking()
            .Where(item => item.Id == itemId && item.OrderId == orderId.Value)
            .Select(item => new
            {
                ObjectKey = item.ManualImageObjectKey ?? item.PreviewImageObjectKey,
                ContentType = item.ManualImageObjectKey != null
                    ? item.ManualImageContentType
                    : item.PreviewImageContentType,
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (image?.ObjectKey is null)
        {
            return NotFound();
        }

        var stream = await _objectStorage.GetAsync(image.ObjectKey, cancellationToken);
        return File(stream, image.ContentType ?? "image/webp", enableRangeProcessing: true);
    }
}
