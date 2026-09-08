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
        OrderTracking.Application.Orders.Models.OrderDetailsDto result;
        try { result = await _mediator.Send(
            new CreatePublicOrderCommand(
                request.Name,
                request.Phone,
                request.Telegram,
                request.WhatsApp,
                request.Vk,
                request.Address,
                (request.Items ?? []).Select(item => new PublicOrderItemDto(
                    item.Source ?? "Internal", item.ProductId, item.ExternalId, item.Quantity,
                    item.ExpectedUnitPrice, item.ExpectedCurrencyCode)).ToList()),
            cancellationToken); }
        catch (OrderTracking.Application.Common.Interfaces.CatalogCheckoutException ex)
        {
            return Conflict(new { code = "cart_changed", message = ex.Message, issues = ex.Issues });
        }
        catch (OrderTracking.Application.Common.Interfaces.ExternalCatalogUnavailableException ex)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ProblemDetails { Title = "Внешний каталог временно недоступен", Detail = ex.Message });
        }

        return StatusCode(
            StatusCodes.Status201Created,
            new CreatePublicOrderResponse(result.Id, result.TrackingCode));
    }
}

public sealed record CreatePublicOrderRequest(
    string? Name,
    string? Phone,
    string? Telegram,
    string? WhatsApp,
    string? Vk,
    string? Address,
    IReadOnlyList<CreatePublicOrderItemRequest>? Items);

public sealed record CreatePublicOrderItemRequest(string? Source, Guid? ProductId, string? ExternalId, int Quantity,
    decimal? ExpectedUnitPrice, string? ExpectedCurrencyCode);

public sealed record CreatePublicOrderResponse(Guid OrderId, string TrackingCode);
