using System.Data;
using System.Security.Cryptography;
using System.Text;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Products.Application.Common.Interfaces;
using Products.Application.Products.ImportProducts;
using Products.Domain.Entities;
using Products.Domain.Enums;
using Products.Infrastructure.Persistence;

namespace Products.Api.Controllers;

[ApiController]
[Route("api/products/crawler-jobs")]
public sealed class CrawlerJobsController : ControllerBase
{
    private readonly ProductsDbContext _db;
    private readonly IMediator _mediator;
    private readonly IConfiguration _configuration;
    private readonly ICurrentUserService _currentUser;

    public CrawlerJobsController(
        ProductsDbContext db,
        IMediator mediator,
        IConfiguration configuration,
        ICurrentUserService currentUser)
    {
        _db = db;
        _mediator = mediator;
        _configuration = configuration;
        _currentUser = currentUser;
    }

    [HttpGet]
    [Authorize]
    public async Task<ActionResult<CrawlerJobListResult>> List(
        [FromQuery] int limit = 50,
        CancellationToken cancellationToken = default)
    {
        limit = Math.Clamp(limit, 1, 100);
        var jobs = await _db.CrawlerJobs
            .AsNoTracking()
            .Include(x => x.Category)
            .Include(x => x.Logs)
            .OrderByDescending(x => x.CreatedAt)
            .Take(limit)
            .ToListAsync(cancellationToken);

        return new CrawlerJobListResult(jobs.Select(ToDto).ToList());
    }

    [HttpGet("{id:guid}")]
    [Authorize]
    public async Task<ActionResult<CrawlerJobDto>> Get(
        Guid id,
        CancellationToken cancellationToken)
    {
        var job = await _db.CrawlerJobs
            .AsNoTracking()
            .Include(x => x.Category)
            .Include(x => x.Logs)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (job is null) return NotFound();
        return ToDto(job);
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<CrawlerJobDto>> Create(
        [FromBody] CreateCrawlerJobRequest request,
        CancellationToken cancellationToken)
    {
        if (!Uri.TryCreate(request.Url, UriKind.Absolute, out var uri)
            || uri.Scheme != Uri.UriSchemeHttps
            || !(uri.Host.Equals("maketto.jp", StringComparison.OrdinalIgnoreCase)
                 || uri.Host.EndsWith(".maketto.jp", StringComparison.OrdinalIgnoreCase)))
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Некорректная ссылка",
                Detail = "Поддерживаются только HTTPS-ссылки каталога maketto.jp.",
            });
        }

        if (request.Pages is < 1 or > 1000)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Некорректное количество страниц",
                Detail = "Количество страниц должно быть от 1 до 1000.",
            });
        }

        var category = await _db.Categories.FirstOrDefaultAsync(
            x => x.Id == request.CategoryId && x.IsActive,
            cancellationToken);
        if (category is null) return BadRequest(new ProblemDetails { Detail = "Категория не найдена." });

        var categoryParts = await _db.Categories
            .AsNoTracking()
            .ToDictionaryAsync(
                x => x.Id,
                x => new CategoryPathPart(x.Name, x.ParentId),
                cancellationToken);

        var job = new CrawlerJob
        {
            Id = Guid.NewGuid(),
            Url = uri.ToString(),
            RequestedPages = request.Pages,
            CategoryId = category.Id,
            Category = category,
            CategoryPath = Trim(BuildCategoryPath(category.Id, categoryParts), 1000)!,
            CreatedBy = _currentUser.Login,
        };
        AddLog(job, "info", "Задача добавлена в очередь.");
        _db.CrawlerJobs.Add(job);
        await _db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = job.Id }, ToDto(job));
    }

    [HttpPost("worker/claim")]
    [AllowAnonymous]
    public async Task<ActionResult<CrawlerWorkerJobDto>> Claim(CancellationToken cancellationToken)
    {
        if (!IsWorkerAuthorized()) return Unauthorized();

        await using var transaction = await _db.Database.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);
        var now = DateTimeOffset.UtcNow;
        var staleBefore = now.AddMinutes(-5);
        var staleJobs = await _db.CrawlerJobs
            .Where(x => x.Status == CrawlerJobStatus.Running
                        && (x.HeartbeatAt == null || x.HeartbeatAt < staleBefore))
            .ToListAsync(cancellationToken);
        foreach (var stale in staleJobs)
        {
            stale.Status = CrawlerJobStatus.Pending;
            stale.LastError = "Worker перестал отправлять heartbeat; задача возвращена в очередь.";
            AddLog(stale, "warning", stale.LastError);
        }

        var job = await _db.CrawlerJobs
            .Include(x => x.Category)
            .Where(x => x.Status == CrawlerJobStatus.Pending)
            .OrderBy(x => x.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
        if (job is null)
        {
            await _db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return NoContent();
        }

        job.Status = CrawlerJobStatus.Running;
        job.StartedAt ??= now;
        job.HeartbeatAt = now;
        job.CompletedAt = null;
        job.LastError = null;
        job.ProcessedPages = 0;
        job.LastPage = 0;
        job.ProductsFound = 0;
        job.AttemptCount++;
        AddLog(job, "info", $"Worker начал выполнение, попытка {job.AttemptCount}.");
        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return new CrawlerWorkerJobDto(
            job.Id,
            job.Url,
            job.RequestedPages,
            job.CategoryId,
            job.Category.Name,
            job.ProcessedPages);
    }

    [HttpPost("{id:guid}/worker/heartbeat")]
    [AllowAnonymous]
    public async Task<IActionResult> Heartbeat(Guid id, CancellationToken cancellationToken)
    {
        if (!IsWorkerAuthorized()) return Unauthorized();
        var job = await RunningJob(id, cancellationToken);
        if (job is null) return NotFound();
        job.HeartbeatAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:guid}/worker/progress")]
    [AllowAnonymous]
    public async Task<IActionResult> Progress(
        Guid id,
        [FromBody] CrawlerProgressRequest request,
        CancellationToken cancellationToken)
    {
        if (!IsWorkerAuthorized()) return Unauthorized();
        var job = await RunningJob(id, cancellationToken);
        if (job is null) return NotFound();

        job.ProcessedPages = Math.Clamp(
            Math.Max(job.ProcessedPages, request.ProcessedPages),
            0,
            job.RequestedPages);
        job.LastPage = Math.Clamp(request.CurrentPage, 0, job.RequestedPages);
        job.ProductsFound = Math.Max(job.ProductsFound, request.ProductsFound);
        job.HeartbeatAt = DateTimeOffset.UtcNow;
        foreach (var line in request.Logs?.TakeLast(30) ?? Enumerable.Empty<string>())
            AddLog(job, "info", line);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:guid}/worker/batch")]
    [AllowAnonymous]
    public async Task<ActionResult<ImportProductsResult>> ImportBatch(
        Guid id,
        [FromBody] CrawlerBatchRequest request,
        CancellationToken cancellationToken)
    {
        if (!IsWorkerAuthorized()) return Unauthorized();
        var job = await RunningJob(id, cancellationToken);
        if (job is null) return NotFound();
        if (request.Products.Count is < 1 or > 100)
            return BadRequest(new ProblemDetails { Detail = "Батч должен содержать от 1 до 100 товаров." });

        var products = request.Products
            .Select(item => item with
            {
                CategoryId = job.CategoryId,
                Category = null,
                CategoryName = null,
                CategorySlug = null,
                ParentCategoryId = null,
                ParentCategory = null,
                ParentCategoryName = null,
                ParentCategorySlug = null,
                Categories = null,
            })
            .ToList();
        var result = await _mediator.Send(
            new ImportProductsCommand(products, CreateMissingCategories: false),
            cancellationToken);

        job.ProductsFound = Math.Max(job.ProductsFound, request.ProductsFound);
        job.ImportedCount += result.InsertedCount;
        job.SkippedCount += result.SkippedCount;
        job.FailedCount += result.FailedCount;
        job.HeartbeatAt = DateTimeOffset.UtcNow;
        AddLog(
            job,
            result.FailedCount > 0 ? "warning" : "info",
            $"Импортирован батч: новых {result.InsertedCount}, пропущено {result.SkippedCount}, ошибок {result.FailedCount}.");
        await _db.SaveChangesAsync(cancellationToken);
        return result;
    }

    [HttpPost("{id:guid}/worker/complete")]
    [AllowAnonymous]
    public async Task<IActionResult> Complete(
        Guid id,
        [FromBody] CrawlerCompleteRequest request,
        CancellationToken cancellationToken)
    {
        if (!IsWorkerAuthorized()) return Unauthorized();
        var job = await RunningJob(id, cancellationToken);
        if (job is null) return NotFound();
        job.ProcessedPages = Math.Clamp(request.ProcessedPages, 0, job.RequestedPages);
        job.LastPage = Math.Clamp(request.CurrentPage, 0, job.RequestedPages);
        job.ProductsFound = Math.Max(job.ProductsFound, request.ProductsFound);
        job.Status = CrawlerJobStatus.Completed;
        job.CompletedAt = DateTimeOffset.UtcNow;
        job.HeartbeatAt = job.CompletedAt;
        AddLog(job, "info", "Задача успешно завершена.");
        foreach (var line in request.Logs?.TakeLast(30) ?? Enumerable.Empty<string>()) AddLog(job, "info", line);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:guid}/worker/fail")]
    [AllowAnonymous]
    public async Task<IActionResult> Fail(
        Guid id,
        [FromBody] CrawlerFailRequest request,
        CancellationToken cancellationToken)
    {
        if (!IsWorkerAuthorized()) return Unauthorized();
        var job = await RunningJob(id, cancellationToken);
        if (job is null) return NotFound();
        job.ProcessedPages = Math.Clamp(
            Math.Max(job.ProcessedPages, request.ProcessedPages),
            0,
            job.RequestedPages);
        job.LastPage = Math.Clamp(request.CurrentPage, 0, job.RequestedPages);
        job.ProductsFound = Math.Max(job.ProductsFound, request.ProductsFound);
        job.Status = CrawlerJobStatus.Failed;
        job.LastError = Trim(request.Error, 4000);
        job.CompletedAt = DateTimeOffset.UtcNow;
        job.HeartbeatAt = job.CompletedAt;
        AddLog(job, "error", job.LastError ?? "Crawler завершился с ошибкой.");
        foreach (var line in request.Logs?.TakeLast(30) ?? Enumerable.Empty<string>()) AddLog(job, "info", line);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private Task<CrawlerJob?> RunningJob(Guid id, CancellationToken cancellationToken) =>
        _db.CrawlerJobs.FirstOrDefaultAsync(
            x => x.Id == id && x.Status == CrawlerJobStatus.Running,
            cancellationToken);

    private bool IsWorkerAuthorized()
    {
        var configured = _configuration["Crawler:ApiKey"];
        var received = Request.Headers["X-Crawler-Key"].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(configured) || string.IsNullOrWhiteSpace(received)) return false;
        var expectedBytes = Encoding.UTF8.GetBytes(configured);
        var receivedBytes = Encoding.UTF8.GetBytes(received);
        return expectedBytes.Length == receivedBytes.Length
               && CryptographicOperations.FixedTimeEquals(expectedBytes, receivedBytes);
    }

    private static void AddLog(CrawlerJob job, string level, string message) =>
        job.Logs.Add(new CrawlerJobLog
        {
            Id = Guid.NewGuid(),
            CreatedAt = DateTimeOffset.UtcNow,
            Level = Trim(level, 16) ?? "info",
            Message = Trim(message, 2000) ?? string.Empty,
        });

    private static string? Trim(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var trimmed = value.Trim();
        return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
    }

    private static string BuildCategoryPath(
        Guid categoryId,
        IReadOnlyDictionary<Guid, CategoryPathPart> categories)
    {
        var names = new Stack<string>();
        var visited = new HashSet<Guid>();
        Guid? currentId = categoryId;
        while (currentId is not null
               && visited.Add(currentId.Value)
               && categories.TryGetValue(currentId.Value, out var category))
        {
            names.Push(category.Name);
            currentId = category.ParentId;
        }

        return string.Join(" → ", names);
    }

    private static CrawlerJobDto ToDto(CrawlerJob job) => new(
        job.Id,
        job.Url,
        job.RequestedPages,
        job.CategoryId,
        job.Category?.Name ?? "Удалённая категория",
        string.IsNullOrWhiteSpace(job.CategoryPath)
            ? job.Category?.Name ?? "Удалённая категория"
            : job.CategoryPath,
        job.Status.ToString().ToLowerInvariant(),
        job.ProcessedPages,
        job.LastPage,
        job.RequestedPages == 0
            ? 0
            : job.Status == CrawlerJobStatus.Completed
                ? 100
                : Math.Clamp((int)Math.Round(job.ProcessedPages * 100d / job.RequestedPages), 0, 99),
        job.ProductsFound,
        job.ImportedCount,
        job.SkippedCount,
        job.FailedCount,
        job.AttemptCount,
        job.CreatedBy,
        job.LastError,
        job.CreatedAt,
        job.StartedAt,
        job.CompletedAt,
        job.HeartbeatAt,
        job.Logs
            .OrderByDescending(x => x.CreatedAt)
            .Take(100)
            .OrderBy(x => x.CreatedAt)
            .Select(x => new CrawlerJobLogDto(x.Id, x.CreatedAt, x.Level, x.Message))
            .ToList());
}

public sealed record CreateCrawlerJobRequest(string Url, int Pages, Guid CategoryId);
public sealed record CrawlerJobListResult(IReadOnlyList<CrawlerJobDto> Items);
public sealed record CrawlerJobLogDto(Guid Id, DateTimeOffset CreatedAt, string Level, string Message);
public sealed record CrawlerJobDto(
    Guid Id,
    string Url,
    int RequestedPages,
    Guid CategoryId,
    string CategoryName,
    string CategoryPath,
    string Status,
    int ProcessedPages,
    int LastPage,
    int ProgressPercent,
    int ProductsFound,
    int ImportedCount,
    int SkippedCount,
    int FailedCount,
    int AttemptCount,
    string? CreatedBy,
    string? LastError,
    DateTimeOffset CreatedAt,
    DateTimeOffset? StartedAt,
    DateTimeOffset? CompletedAt,
    DateTimeOffset? HeartbeatAt,
    IReadOnlyList<CrawlerJobLogDto> Logs);
public sealed record CrawlerWorkerJobDto(
    Guid Id,
    string Url,
    int RequestedPages,
    Guid CategoryId,
    string CategoryName,
    int ProcessedPages);
public sealed record CrawlerProgressRequest(
    int ProcessedPages,
    int ProductsFound,
    int CurrentPage = 0,
    IReadOnlyList<string>? Logs = null);
public sealed record CrawlerBatchRequest(
    IReadOnlyList<ImportProductItem> Products,
    int ProductsFound);
public sealed record CrawlerCompleteRequest(
    int ProcessedPages,
    int ProductsFound,
    int CurrentPage = 0,
    IReadOnlyList<string>? Logs = null);
public sealed record CrawlerFailRequest(
    string Error,
    int ProcessedPages,
    int ProductsFound,
    int CurrentPage = 0,
    IReadOnlyList<string>? Logs = null);
internal sealed record CategoryPathPart(string Name, Guid? ParentId);
