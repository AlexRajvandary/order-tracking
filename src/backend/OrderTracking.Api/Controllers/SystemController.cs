using Microsoft.AspNetCore.Mvc;

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
}
