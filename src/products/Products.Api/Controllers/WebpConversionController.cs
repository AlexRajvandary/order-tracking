using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Products.Domain.Enums;
using Products.Infrastructure.Persistence;
using Products.Infrastructure.Services;

namespace Products.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/products/image-webp-conversion")]
public sealed class WebpConversionController(WebpConversionService conversion, ProductsDbContext db) : ControllerBase
{
    [HttpGet]
    public ActionResult<WebpConversionStatus?> Get() => Ok(conversion.Current);

    [HttpPost]
    public async Task<ActionResult<WebpConversionStatus>> Start(CancellationToken cancellationToken)
    {
        var importing = await db.ImageImportJobs.AnyAsync(x =>
            x.Status == ImageImportJobStatus.Pending || x.Status == ImageImportJobStatus.Running
            || x.Status == ImageImportJobStatus.PauseRequested || x.Status == ImageImportJobStatus.Paused
            || x.Status == ImageImportJobStatus.CancelRequested, cancellationToken);
        if (importing) return Conflict(new ProblemDetails { Detail = "Сначала дождитесь окончания загрузки изображений." });
        var job = conversion.Start();
        return job is null ? Conflict(new ProblemDetails { Detail = "Конвертация уже выполняется." }) : Accepted(job);
    }

    [HttpPost("cancel")]
    public ActionResult<WebpConversionStatus?> Cancel() => Ok(conversion.Cancel());
}
