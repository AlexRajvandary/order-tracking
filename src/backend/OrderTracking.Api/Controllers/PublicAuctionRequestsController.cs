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
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(PublicServiceRequestUploadMapper.MaxRequestBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = PublicServiceRequestUploadMapper.MaxRequestBytes)]
    public async Task<ActionResult<CreatePublicAuctionRequestResponse>> Create(
        [FromForm] CreatePublicAuctionRequestRequest request,
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
                BudgetJpy: request.MaxBidJpy,
                Images: PublicServiceRequestUploadMapper.Map(request.Images)),
            cancellationToken);

        return StatusCode(
            StatusCodes.Status201Created,
            new CreatePublicAuctionRequestResponse(result.Id, result.TrackingCode));
    }
}

public sealed class CreatePublicAuctionRequestRequest
{
    public string ContactType { get; init; } = string.Empty;

    public string Contact { get; init; } = string.Empty;

    public string CustomerName { get; init; } = string.Empty;

    public string LotUrl { get; init; } = string.Empty;

    public decimal? MaxBidJpy { get; init; }

    public string? Comment { get; init; }

    public List<IFormFile> Images { get; init; } = [];
}

public sealed record CreatePublicAuctionRequestResponse(Guid OrderId, string TrackingCode);
