using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using OrderTracking.Application.Orders.CreatePublicIndividualRequest;

namespace OrderTracking.Api.Controllers;

[ApiController]
[Route("api/v1/public/individual-requests")]
[AllowAnonymous]
public sealed class PublicIndividualRequestsController : ControllerBase
{
    private readonly IMediator _mediator;

    public PublicIndividualRequestsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost]
    [EnableRateLimiting("checkout")]
    public async Task<ActionResult<CreatePublicIndividualRequestResponse>> Create(
        [FromBody] CreatePublicIndividualRequestRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new CreatePublicIndividualRequestCommand(
                request.ContactType,
                request.Contact,
                request.CustomerName,
                request.ProductUrl,
                request.Description),
            cancellationToken);

        return StatusCode(
            StatusCodes.Status201Created,
            new CreatePublicIndividualRequestResponse(result.Id, result.TrackingCode));
    }
}

public sealed record CreatePublicIndividualRequestRequest(
    string ContactType,
    string Contact,
    string CustomerName,
    string? ProductUrl,
    string Description);

public sealed record CreatePublicIndividualRequestResponse(Guid OrderId, string TrackingCode);
