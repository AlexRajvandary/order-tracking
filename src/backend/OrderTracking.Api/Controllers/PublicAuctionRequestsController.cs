using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using OrderTracking.Application.Orders.CreatePublicServiceRequest;

namespace OrderTracking.Api.Controllers;

[ApiController]
[Route("api/v1/public/auction-requests")]
[AllowAnonymous]
public sealed class PublicAuctionRequestsController : ControllerBase
{
    private readonly IMediator _mediator;

    public PublicAuctionRequestsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost]
    [EnableRateLimiting("checkout")]
    public async Task<ActionResult<CreatePublicAuctionRequestResponse>> Create(
        [FromBody] CreatePublicAuctionRequestRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new CreatePublicServiceRequestCommand(
                PublicServiceRequestType.Auction,
                request.ContactType,
                request.Contact,
                request.CustomerName,
                request.LotUrl,
                request.Comment,
                BudgetJpy: request.MaxBidJpy),
            cancellationToken);

        return StatusCode(
            StatusCodes.Status201Created,
            new CreatePublicAuctionRequestResponse(result.Id, result.TrackingCode));
    }
}

public sealed record CreatePublicAuctionRequestRequest(
    string ContactType,
    string Contact,
    string CustomerName,
    string LotUrl,
    decimal? MaxBidJpy,
    string? Comment);

public sealed record CreatePublicAuctionRequestResponse(Guid OrderId, string TrackingCode);
