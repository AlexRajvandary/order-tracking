using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Products.Api.Services;

namespace Products.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/products/analytics")]
public sealed class CatalogAnalyticsController(CatalogAnalyticsCacheService analytics) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<CatalogAnalyticsDto>> Get(CancellationToken cancellationToken) =>
        Ok(await analytics.GetAsync(cancellationToken));
}
