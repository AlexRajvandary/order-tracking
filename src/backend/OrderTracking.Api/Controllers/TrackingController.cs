using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using OrderTracking.Application.Tracking.GetOrderByTrackingCode;
using OrderTracking.Application.Tracking.Models;

namespace OrderTracking.Api.Controllers;

[ApiController]
[Route("api/v1/track")]
[AllowAnonymous]
public sealed class TrackingController : ControllerBase
{
    private readonly IMediator _mediator;

    public TrackingController(IMediator mediator)
    {
        _mediator = mediator;
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
}
