using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Monitoring.Models;

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
}
