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
    public async Task<ActionResult<CreatePublicTicketRequestResponse>> Create(
        [FromBody] CreatePublicTicketRequestRequest request,
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
                request.BudgetJpy),
            cancellationToken);

        return StatusCode(
            StatusCodes.Status201Created,
            new CreatePublicTicketRequestResponse(result.Id, result.TrackingCode));
    }
}

public sealed record CreatePublicTicketRequestRequest(
    string ContactType,
    string Contact,
    string CustomerName,
    string EventName,
    string? EventUrl,
    string? EventDate,
    string? Location,
    int Quantity,
    decimal? BudgetJpy,
    string? Comment);

public sealed record CreatePublicTicketRequestResponse(Guid OrderId, string TrackingCode);
