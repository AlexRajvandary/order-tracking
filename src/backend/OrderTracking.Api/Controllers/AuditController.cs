using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderTracking.Application.Audit.GetAuditLogById;

namespace OrderTracking.Api.Controllers;

[ApiController]
[Route("api/v1/audit")]
[Authorize]
public sealed class AuditController : ControllerBase
{
    private readonly IMediator _mediator;

    public AuditController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AuditLogDetailsDto>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetAuditLogByIdQuery(id), cancellationToken);
        return Ok(result);
    }
}
