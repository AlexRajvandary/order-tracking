using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Monitoring.Models;
using OrderTracking.Application.Products.NotifyProductImport;
using MediatR;

namespace OrderTracking.Api.Controllers;

[ApiController]
[Route("api/v1")]
public sealed class SystemController : ControllerBase
{
    [HttpGet("ping")]
    public IActionResult Ping()
    {
        return Ok(new
        {
            status = "ok",
            service = "order-tracking-api",
            timestamp = DateTimeOffset.UtcNow
        });
    }

    [HttpGet("system/storage")]
    [Authorize]
    public async Task<ActionResult<StorageMetricsDto>> GetStorageMetrics(
        [FromServices] IStorageMetricsService storageMetricsService,
        CancellationToken cancellationToken)
    {
        return Ok(await storageMetricsService.GetMetricsAsync(cancellationToken));
    }

    [HttpPost("products/import-notification")]
    [Authorize]
    public async Task<IActionResult> NotifyProductImport(
        [FromBody] NotifyProductImportCommand command,
        [FromServices] IMediator mediator,
        CancellationToken cancellationToken)
    {
        await mediator.Send(command, cancellationToken);
        return NoContent();
    }
}
