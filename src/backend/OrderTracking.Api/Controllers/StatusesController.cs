using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderTracking.Application.Statuses.CreateStatusDefinition;
using OrderTracking.Application.Statuses.DeactivateStatusDefinition;
using OrderTracking.Application.Statuses.GetStatusDefinitions;
using OrderTracking.Application.Statuses.Models;
using OrderTracking.Application.Statuses.UpdateStatusDefinition;

namespace OrderTracking.Api.Controllers;

[ApiController]
[Route("api/v1/statuses")]
[Authorize]
public sealed class StatusesController : ControllerBase
{
    private readonly IMediator _mediator;

    public StatusesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<StatusDefinitionDto>>> GetStatuses(
        [FromQuery] bool includeInactive = false,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(
            new GetStatusDefinitionsQuery(includeInactive),
            cancellationToken);

        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<StatusDefinitionDto>> CreateStatus(
        [FromBody] UpsertStatusRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new CreateStatusDefinitionCommand(
                request.Name,
                request.Color,
                request.DefaultCountry,
                request.DefaultLocation,
                request.PublishAfterDays,
                request.SortOrder,
                request.IsFinal),
            cancellationToken);

        return CreatedAtAction(nameof(GetStatuses), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<StatusDefinitionDto>> UpdateStatus(
        Guid id,
        [FromBody] UpdateStatusRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new UpdateStatusDefinitionCommand(
                id,
                request.Name,
                request.Color,
                request.DefaultCountry,
                request.DefaultLocation,
                request.PublishAfterDays,
                request.SortOrder,
                request.IsActive,
                request.IsFinal),
            cancellationToken);

        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeactivateStatus(Guid id, CancellationToken cancellationToken)
    {
        await _mediator.Send(new DeactivateStatusDefinitionCommand(id), cancellationToken);
        return NoContent();
    }
}

public sealed record UpsertStatusRequest(
    string Name,
    string? Color,
    string? DefaultCountry = null,
    string? DefaultLocation = null,
    int? PublishAfterDays = null,
    int SortOrder = 0,
    bool IsFinal = false);

public sealed record UpdateStatusRequest(
    string Name,
    string? Color,
    string? DefaultCountry,
    string? DefaultLocation,
    int? PublishAfterDays,
    int SortOrder,
    bool IsActive,
    bool IsFinal);
