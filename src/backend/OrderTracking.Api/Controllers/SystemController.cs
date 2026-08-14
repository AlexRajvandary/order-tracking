using System.Security.Cryptography;
using System.Text;
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
    private static readonly HashSet<string> VpsStatsFields =
        ["cpu", "disk", "io", "memory", "traffic"];

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

    [HttpGet("system/vps-stats/{field}")]
    [Authorize]
    public async Task<ActionResult<VpsStatsDto>> GetVpsStats(
        string field,
        [FromQuery] DateTimeOffset? start,
        [FromQuery] DateTimeOffset? end,
        [FromServices] IVpsStatsService vpsStatsService,
        CancellationToken cancellationToken)
    {
        field = field.Trim().ToLowerInvariant();
        if (!VpsStatsFields.Contains(field))
            return BadRequest(new ProblemDetails { Detail = "Unsupported VPS statistics field." });

        var periodEnd = end ?? DateTimeOffset.UtcNow;
        var periodStart = start ?? periodEnd.AddHours(-1);
        if (periodStart >= periodEnd)
            return BadRequest(new ProblemDetails { Detail = "The start date must be earlier than the end date." });
        if (periodEnd - periodStart > TimeSpan.FromDays(31))
            return BadRequest(new ProblemDetails { Detail = "The statistics period cannot exceed 31 days." });
        if (periodEnd > DateTimeOffset.UtcNow.AddMinutes(5))
            return BadRequest(new ProblemDetails { Detail = "The end date cannot be in the future." });

        try
        {
            return Ok(await vpsStatsService.GetAsync(
                field,
                periodStart,
                periodEnd,
                cancellationToken));
        }
        catch (HttpRequestException exception)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new ProblemDetails
            {
                Title = "Fornex API is unavailable",
                Detail = exception.Message,
                Status = StatusCodes.Status502BadGateway,
            });
        }
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

    [HttpPost("products/crawler-notification")]
    [AllowAnonymous]
    public async Task<IActionResult> NotifyCrawlerJob(
        [FromBody] CrawlerNotificationRequest request,
        [FromServices] ITelegramAdminNotifier telegram,
        [FromServices] IConfiguration configuration,
        CancellationToken cancellationToken)
    {
        if (!IsCrawlerAuthorized(configuration)) return Unauthorized();
        if (request.JobId == Guid.Empty || string.IsNullOrWhiteSpace(request.Category))
            return BadRequest(new ProblemDetails { Detail = "JobId and category are required." });

        var category = request.Category.Trim();
        switch (request.Event?.Trim().ToLowerInvariant())
        {
            case "started":
                if (!Uri.TryCreate(request.Url, UriKind.Absolute, out var uri)
                    || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
                {
                    return BadRequest(new ProblemDetails { Detail = "A valid HTTP URL is required." });
                }
                await telegram.NotifyCrawlerJobStartedAsync(
                    request.JobId,
                    uri.ToString(),
                    category,
                    cancellationToken);
                break;
            case "finished":
                if (request.InsertedCount < 0)
                    return BadRequest(new ProblemDetails { Detail = "InsertedCount cannot be negative." });
                await telegram.NotifyCrawlerJobFinishedAsync(
                    request.JobId,
                    request.InsertedCount,
                    category,
                    cancellationToken);
                break;
            default:
                return BadRequest(new ProblemDetails { Detail = "Event must be 'started' or 'finished'." });
        }

        return Accepted();
    }

    private bool IsCrawlerAuthorized(IConfiguration configuration)
    {
        var configured = configuration["Crawler:ApiKey"];
        var received = Request.Headers["X-Crawler-Key"].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(configured) || string.IsNullOrWhiteSpace(received)) return false;
        var expectedBytes = Encoding.UTF8.GetBytes(configured);
        var receivedBytes = Encoding.UTF8.GetBytes(received);
        return expectedBytes.Length == receivedBytes.Length
               && CryptographicOperations.FixedTimeEquals(expectedBytes, receivedBytes);
    }
}

public sealed record CrawlerNotificationRequest(
    Guid JobId,
    string Event,
    string? Url,
    string Category,
    int InsertedCount = 0);
