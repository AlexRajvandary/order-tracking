using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using OrderTracking.Application.Orders.CreatePublicServiceRequest;

namespace OrderTracking.Api.Controllers;

[ApiController]
[Route("api/v1/public/find-product-requests")]
[AllowAnonymous]
public sealed class PublicFindProductRequestsController : ControllerBase
{
    private readonly IMediator _mediator;

    public PublicFindProductRequestsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost]
    [EnableRateLimiting("checkout")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(PublicServiceRequestUploadMapper.MaxRequestBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = PublicServiceRequestUploadMapper.MaxRequestBytes)]
    public async Task<ActionResult<CreatePublicFindProductRequestResponse>> Create(
        [FromForm] CreatePublicFindProductRequestRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new CreatePublicServiceRequestCommand(
                PublicServiceRequestType.FindProduct,
                request.ContactType,
                request.Contact,
                request.CustomerName,
                request.ProductUrl,
                request.Description,
                Images: PublicServiceRequestUploadMapper.Map(request.Images)),
            cancellationToken);

        return StatusCode(
            StatusCodes.Status201Created,
            new CreatePublicFindProductRequestResponse(result.Id, result.TrackingCode));
    }
}

public sealed class CreatePublicFindProductRequestRequest
{
    public string ContactType { get; init; } = string.Empty;
    public string Contact { get; init; } = string.Empty;
    public string? CustomerName { get; init; }
    public string? ProductUrl { get; init; }
    public string? Description { get; init; }
    public List<IFormFile> Images { get; init; } = [];
}

public sealed record CreatePublicFindProductRequestResponse(Guid OrderId, string TrackingCode);
