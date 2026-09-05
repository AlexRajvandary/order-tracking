using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using OrderTracking.Application.Orders.CreatePublicServiceRequest;

namespace OrderTracking.Api.Controllers;

[ApiController]
[Route("api/v1/public/ticket-requests")]
[AllowAnonymous]
public sealed class PublicTicketRequestsController : ControllerBase
{
    private readonly IMediator _mediator;

    public PublicTicketRequestsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost]
    [EnableRateLimiting("checkout")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(PublicServiceRequestUploadMapper.MaxRequestBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = PublicServiceRequestUploadMapper.MaxRequestBytes)]
    public async Task<ActionResult<CreatePublicTicketRequestResponse>> Create(
        [FromForm] CreatePublicTicketRequestRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new CreatePublicServiceRequestCommand(
                PublicServiceRequestType.Ticket,
                request.ContactType,
                request.Contact,
                request.CustomerName,
                request.EventUrl,
                request.Comment,
                request.EventName,
                request.EventDate,
                request.Location,
                request.Quantity,
                request.BudgetJpy,
                PublicServiceRequestUploadMapper.Map(request.Images)),
            cancellationToken);

        return StatusCode(
            StatusCodes.Status201Created,
            new CreatePublicTicketRequestResponse(result.Id, result.TrackingCode));
    }
}

public sealed class CreatePublicTicketRequestRequest
{
    public string ContactType { get; init; } = string.Empty;

    public string Contact { get; init; } = string.Empty;

    public string CustomerName { get; init; } = string.Empty;

    public string EventName { get; init; } = string.Empty;

    public string? EventUrl { get; init; }

    public string? EventDate { get; init; }

    public string? Location { get; init; }

    public int Quantity { get; init; }

    public decimal? BudgetJpy { get; init; }

    public string? Comment { get; init; }

    public List<IFormFile> Images { get; init; } = [];
}

public sealed record CreatePublicTicketRequestResponse(Guid OrderId, string TrackingCode);
