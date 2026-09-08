using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Products.Domain.Entities;
using Products.Domain.Enums;
using Products.Infrastructure.Persistence;

namespace Products.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/admin/image-import-jobs")]
[Route("api/products/image-import-jobs")]
public sealed class ImageImportJobsController : ControllerBase
{
    private const int MaxItems = 100_000;
    private readonly ProductsDbContext _db;

    public ImageImportJobsController(ProductsDbContext db) => _db = db;

    [HttpPost]
    public async Task<ActionResult<ImageImportJobDto>> Create(
        [FromBody] CreateImageImportJobRequest request,
        CancellationToken cancellationToken)
    {
        if (!Enum.IsDefined(request.Scope)) return BadRequest(new ProblemDetails { Detail = "Неизвестная область импорта." });
        var parallelism = request.Parallelism ?? 5;
        if (parallelism is < 1 or > 10) return BadRequest(new ProblemDetails { Detail = "Параллелизм должен быть от 1 до 10." });
        if (request.Limit is <= 0 or > MaxItems) return BadRequest(new ProblemDetails { Detail = $"Количество должно быть от 1 до {MaxItems}." });

        var ids = request.ProductIds?.Distinct().ToArray() ?? [];
        if (request.Scope == ImageImportJobScope.Selected && ids.Length == 0)
            return BadRequest(new ProblemDetails { Detail = "Для выбранных товаров передайте productIds." });
        if (request.Scope == ImageImportJobScope.AllMissing && ids.Length > 0)
            return BadRequest(new ProblemDetails { Detail = "Для всех товаров productIds должен быть пустым." });

        var active = await _db.ImageImportJobs.AnyAsync(x =>
            x.Status == ImageImportJobStatus.Pending || x.Status == ImageImportJobStatus.Running
            || x.Status == ImageImportJobStatus.PauseRequested || x.Status == ImageImportJobStatus.Paused
            || x.Status == ImageImportJobStatus.CancelRequested, cancellationToken);
        if (active) return Conflict(new ProblemDetails { Detail = "Уже существует активная задача загрузки изображений." });

        var query = _db.Products.AsNoTracking().Where(x => x.ImageUrl != "");
        query = request.Scope == ImageImportJobScope.AllMissing
            ? query.Where(x => x.LocalImageUrl == null || x.LocalImageUrl == "")
            : query.Where(x => ids.Contains(x.Id));
        query = query.OrderBy(x => x.Id);
        if (request.Scope == ImageImportJobScope.AllMissing && request.Limit is int limit) query = query.Take(limit);
        var productIds = await query.Select(x => x.Id).ToListAsync(cancellationToken);
        if (request.Scope == ImageImportJobScope.Selected && productIds.Count != ids.Length)
            return NotFound(new ProblemDetails { Detail = "Один или несколько товаров не найдены." });

        var now = DateTimeOffset.UtcNow;
        var job = new ImageImportJob
        {
            Id = Guid.NewGuid(), Scope = request.Scope,
            Status = productIds.Count == 0 ? ImageImportJobStatus.Completed : ImageImportJobStatus.Pending,
            Parallelism = parallelism, TotalItems = productIds.Count,
            CreatedAt = now, UpdatedAt = now, CompletedAt = productIds.Count == 0 ? now : null,
            Items = productIds.Select(id => new ImageImportJobItem
            {
                Id = Guid.NewGuid(), ProductId = id, CreatedAt = now,
            }).ToList(),
        };
        _db.ImageImportJobs.Add(job);
        await _db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = job.Id }, ToDto(job));
    }

    [HttpGet]
    public async Task<IReadOnlyList<ImageImportJobDto>> List(CancellationToken cancellationToken) =>
        (await _db.ImageImportJobs.AsNoTracking().OrderByDescending(x => x.CreatedAt).Take(50).ToListAsync(cancellationToken))
        .Select(ToDto).ToList();

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ImageImportJobDto>> Get(Guid id, CancellationToken cancellationToken)
    {
        var job = await _db.ImageImportJobs.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        return job is null ? NotFound() : ToDto(job);
    }

    [HttpPost("{id:guid}/pause")]
    public Task<ActionResult<ImageImportJobDto>> Pause(Guid id, CancellationToken ct) =>
        Transition(id, ImageImportJobStatus.PauseRequested, ct);

    [HttpPost("{id:guid}/resume")]
    public Task<ActionResult<ImageImportJobDto>> Resume(Guid id, CancellationToken ct) =>
        Transition(id, ImageImportJobStatus.Running, ct);

    [HttpPost("{id:guid}/cancel")]
    public Task<ActionResult<ImageImportJobDto>> Cancel(Guid id, CancellationToken ct) =>
        Transition(id, ImageImportJobStatus.CancelRequested, ct);

    private async Task<ActionResult<ImageImportJobDto>> Transition(Guid id, ImageImportJobStatus target, CancellationToken ct)
    {
        var job = await _db.ImageImportJobs.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (job is null) return NotFound();
        var allowed = target switch
        {
            ImageImportJobStatus.PauseRequested => job.Status is ImageImportJobStatus.Pending or ImageImportJobStatus.Running,
            ImageImportJobStatus.Running => job.Status == ImageImportJobStatus.Paused,
            ImageImportJobStatus.CancelRequested => job.Status is ImageImportJobStatus.Pending or ImageImportJobStatus.Running or ImageImportJobStatus.PauseRequested or ImageImportJobStatus.Paused,
            _ => false,
        };
        if (!allowed) return Conflict(new ProblemDetails { Detail = "Переход недоступен для текущего состояния задачи." });
        job.Status = target;
        job.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
        return ToDto(job);
    }

    private static ImageImportJobDto ToDto(ImageImportJob job) => new(
        job.Id, job.Scope, job.Status, job.Parallelism, job.TotalItems, job.ProcessedItems,
        job.SucceededItems, job.FailedItems, job.ImportedBytes, job.LastError, job.CreatedAt, job.StartedAt, job.CompletedAt,
        job.TotalItems == 0 ? 100 : Math.Round(job.ProcessedItems * 100d / job.TotalItems, 1));
}

public sealed record CreateImageImportJobRequest(
    ImageImportJobScope Scope,
    int? Parallelism,
    int? Limit,
    IReadOnlyCollection<Guid>? ProductIds);

public sealed record ImageImportJobDto(
    Guid Id, ImageImportJobScope Scope, ImageImportJobStatus Status, int Parallelism,
    int TotalItems, int ProcessedItems, int SucceededItems, int FailedItems, long ImportedBytes, string? LastError,
    DateTimeOffset CreatedAt, DateTimeOffset? StartedAt, DateTimeOffset? CompletedAt, double ProgressPercent);
