using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;
using Products.Infrastructure.Services.Sitemap;

namespace Products.Api.Controllers;

[ApiController]
public sealed class SitemapController : ControllerBase
{
    private const string XmlContentType = "application/xml; charset=utf-8";
    private readonly SitemapGenerationService _generation;

    public SitemapController(SitemapGenerationService generation) => _generation = generation;

    [AllowAnonymous]
    [HttpGet("/sitemap.xml")]
    public IActionResult Index() => Serve("sitemap.xml", missingIsUnavailable: true);

    [AllowAnonymous]
    [HttpGet("/sitemaps/{fileName}")]
    public IActionResult Child(string fileName) => Serve(fileName, missingIsUnavailable: false);

    private IActionResult Serve(string fileName, bool missingIsUnavailable)
    {
        var stored = _generation.TryOpenActiveFile(fileName);
        if (stored is null)
        {
            return missingIsUnavailable
                ? StatusCode(StatusCodes.Status503ServiceUnavailable, new ProblemDetails
                {
                    Status = StatusCodes.Status503ServiceUnavailable,
                    Title = "Sitemap generation is not available yet",
                })
                : NotFound();
        }

        var etag = new EntityTagHeaderValue(stored.ETag);
        var requestHeaders = Request.GetTypedHeaders();
        var responseHeaders = Response.GetTypedHeaders();
        responseHeaders.ETag = etag;
        responseHeaders.LastModified = stored.LastModified;
        Response.Headers.CacheControl = "public, max-age=300, stale-if-error=3600";

        var notModified = requestHeaders.IfNoneMatch is { Count: > 0 }
            ? requestHeaders.IfNoneMatch.Any(value => value == EntityTagHeaderValue.Any || value.Compare(etag, useStrongComparison: false))
            : requestHeaders.IfModifiedSince.HasValue
                && stored.LastModified <= requestHeaders.IfModifiedSince.Value.AddSeconds(1);
        if (notModified)
        {
            stored.Stream.Dispose();
            return StatusCode(StatusCodes.Status304NotModified);
        }

        return File(stored.Stream, XmlContentType, stored.LastModified, etag, enableRangeProcessing: false);
    }
}

[ApiController]
[Route("api/internal/sitemap")]
[Authorize]
public sealed class InternalSitemapController : ControllerBase
{
    private readonly SitemapGenerationService _generation;
    private readonly SitemapRegenerationQueue _queue;

    public InternalSitemapController(
        SitemapGenerationService generation,
        SitemapRegenerationQueue queue)
    {
        _generation = generation;
        _queue = queue;
    }

    [HttpPost("regenerate")]
    public IActionResult Regenerate()
    {
        var accepted = _queue.TryQueue($"manual:{User.Identity?.Name ?? "admin"}");
        return Accepted(new { accepted, status = _generation.GetStatus() });
    }

    [HttpGet("status")]
    public ActionResult<SitemapGenerationStatus> Status() => Ok(_generation.GetStatus());
}
