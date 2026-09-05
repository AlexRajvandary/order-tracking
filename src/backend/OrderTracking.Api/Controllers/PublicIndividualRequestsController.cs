using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using OrderTracking.Application.Orders.CreatePublicServiceRequest;

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
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(PublicServiceRequestUploadMapper.MaxRequestBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = PublicServiceRequestUploadMapper.MaxRequestBytes)]
    public async Task<ActionResult<CreatePublicIndividualRequestResponse>> Create(
        [FromForm] CreatePublicIndividualRequestRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new CreatePublicServiceRequestCommand(
                PublicServiceRequestType.Individual,
                request.ContactType,
                request.Contact,
                request.CustomerName,
                request.ProductUrl,
                request.Description,
                Images: PublicServiceRequestUploadMapper.Map(request.Images)),
            cancellationToken);

        return StatusCode(
            StatusCodes.Status201Created,
            new CreatePublicIndividualRequestResponse(result.Id, result.TrackingCode));
    }
}

public sealed class CreatePublicIndividualRequestRequest
{
    public string ContactType { get; init; } = string.Empty;

    public string Contact { get; init; } = string.Empty;

    public string CustomerName { get; init; } = string.Empty;

    public string? ProductUrl { get; init; }

    public string Description { get; init; } = string.Empty;

    public List<IFormFile> Images { get; init; } = [];
}

public sealed record CreatePublicIndividualRequestResponse(Guid OrderId, string TrackingCode);
