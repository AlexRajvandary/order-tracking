using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using OrderTracking.Application.Orders.CreatePublicOrder;

namespace OrderTracking.Api.Controllers;

[ApiController]
[Route("api/v1/public/orders")]
[AllowAnonymous]
public sealed class PublicOrdersController : ControllerBase
{
    private readonly IMediator _mediator;

    public PublicOrdersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost]
    [EnableRateLimiting("checkout")]
    public async Task<ActionResult<CreatePublicOrderResponse>> Create(
        [FromBody] CreatePublicOrderRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new CreatePublicOrderCommand(
                request.Name,
                request.Phone,
                request.WhatsApp,
                request.Vk,
                request.Address,
                (request.Items ?? []).Select(item => new PublicOrderItemDto(
                    item.ProductId,
                    item.Quantity)).ToList()),
            cancellationToken);

        return StatusCode(
            StatusCodes.Status201Created,
            new CreatePublicOrderResponse(result.Id, result.TrackingCode));
    }
}

public sealed record CreatePublicOrderRequest(
    string? Name,
    string? Phone,
    string? WhatsApp,
    string? Vk,
    string? Address,
    IReadOnlyList<CreatePublicOrderItemRequest>? Items);

public sealed record CreatePublicOrderItemRequest(Guid ProductId, int Quantity);

public sealed record CreatePublicOrderResponse(Guid OrderId, string TrackingCode);
