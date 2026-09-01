using System.Data;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Products.Domain.Entities;
using Products.Domain.Enums;
using Products.Infrastructure.Persistence;

namespace Products.Api.Controllers;

[ApiController]
[Route("api/translation-jobs")]
[Route("api/admin/translation-jobs")]
[Route("api/products/translation-jobs")]
public sealed class TranslationJobsController : ControllerBase
{
    private const int DefaultBatchSize = 100;

    private const int DefaultParallelism = 5;

    private const int DefaultMaxParallelism = 10;

    private const long AdvisoryLockKey = 726381921;

    private readonly ProductsDbContext _db;

    private readonly IConfiguration _configuration;

    public TranslationJobsController(
        ProductsDbContext db,
        IConfiguration configuration)
    {
        _db = db;
        _configuration = configuration;
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<TranslationJobDto>> Create(
        [FromBody] CreateTranslationJobRequest request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            return BadRequest(new ProblemDetails { Detail = "Тело запроса обязательно." });
        }

        var parallelism = request.Parallelism ?? DefaultParallelism;
        var maxParallelism = _configuration.GetValue("TranslationJobs:MaxParallelism", DefaultMaxParallelism);
        if (parallelism is < 1 || parallelism > maxParallelism)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Некорректный parallelism",
                Detail = $"Значение должно быть от 1 до {maxParallelism}.",
            });
        }

        var scope = request.Scope;
        if (!Enum.IsDefined(scope))
        {
            return BadRequest(new ProblemDetails { Detail = "Неизвестный режим перевода." });
        }

        var productIds = request.ProductIds?.Distinct().ToArray() ?? [];
        if (scope == TranslationJobScope.Selected && productIds.Length == 0)
        {
            return BadRequest(new ProblemDetails { Detail = "Для Selected нужно передать productIds." });
        }

        if (scope == TranslationJobScope.AllUntranslated && productIds.Length > 0)
        {
            return BadRequest(new ProblemDetails { Detail = "Для AllUntranslated productIds должен быть пустым." });
        }

        await using var transaction = await _db.Database.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);
        await _db.Database.ExecuteSqlRawAsync(
            $"SELECT pg_advisory_xact_lock({AdvisoryLockKey})",
            cancellationToken);

        var active = await _db.TranslationJobs.AnyAsync(
            x => x.Status == TranslationJobStatus.Pending
                || x.Status == TranslationJobStatus.Running
                || x.Status == TranslationJobStatus.PauseRequested
                || x.Status == TranslationJobStatus.Paused
                || x.Status == TranslationJobStatus.CancelRequested,
            cancellationToken);
        if (active)
        {
            return Conflict(new ProblemDetails { Detail = "Уже существует активная задача перевода." });
        }

        var productsQuery = _db.Products.AsNoTracking();
        if (scope == TranslationJobScope.AllUntranslated)
        {
            productsQuery = productsQuery.Where(x => x.NameRu == null || x.NameRu.Trim() == "");
        }
        else
        {
            productsQuery = productsQuery.Where(x => productIds.Contains(x.Id));
        }

        var products = await productsQuery
            .OrderBy(x => x.Id)
            .Select(x => new TranslationSourceDto(x.Id, x.Name))
            .ToListAsync(cancellationToken);
        if (scope == TranslationJobScope.Selected && products.Count != productIds.Length)
        {
            var found = products.Select(x => x.Id).ToHashSet();
            var missing = productIds.Where(x => !found.Contains(x)).ToArray();
            return NotFound(new ProblemDetails { Detail = $"Товары не найдены: {string.Join(", ", missing)}" });
        }

        var now = DateTimeOffset.UtcNow;
        var batchSize = _configuration.GetValue("TranslationJobs:BatchSize", DefaultBatchSize);
        batchSize = Math.Clamp(batchSize, 1, 100);
        var status = products.Count == 0 ? TranslationJobStatus.Completed : TranslationJobStatus.Pending;
        var job = new TranslationJob
        {
            Id = Guid.NewGuid(),
            Scope = scope,
            Status = status,
            Parallelism = parallelism,
            BatchSize = batchSize,
            TotalItems = products.Count,
            Model = _configuration["TranslationJobs:Model"]
                ?? _configuration["OpenAI:Model"]
                ?? "gpt-5-mini",
            PromptVersion = "v1",
            CreatedAt = now,
            UpdatedAt = now,
            CompletedAt = products.Count == 0 ? now : null,
        };

        for (var index = 0; index < products.Count; index++)
        {
            job.Items.Add(new TranslationJobItem
            {
                Id = Guid.NewGuid(),
                ProductId = products[index].Id,
                OriginalName = products[index].Name,
                Status = TranslationJobItemStatus.Pending,
                CreatedAt = now,
            });
        }

        var batchNumber = 1;
        foreach (var batchItems in job.Items.Chunk(batchSize))
        {
            var batch = new TranslationJobBatch
            {
                Id = Guid.NewGuid(),
                BatchNumber = batchNumber++,
                Status = TranslationJobBatchStatus.Pending,
                ItemCount = batchItems.Length,
            };
            job.Batches.Add(batch);
            foreach (var item in batchItems)
            {
                item.BatchId = batch.Id;
            }
        }

        _db.TranslationJobs.Add(job);
        try
        {
            await _db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (exception.InnerException is PostgresException
            { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            return Conflict(new ProblemDetails { Detail = "Уже существует активная задача перевода." });
        }
        catch (PostgresException exception) when (exception.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            return Conflict(new ProblemDetails { Detail = "Уже существует активная задача перевода." });
        }

        return CreatedAtAction(nameof(Get), new { id = job.Id }, ToDto(job));
    }

    [HttpGet]
    [Authorize]
    public async Task<ActionResult<IReadOnlyList<TranslationJobDto>>> List(
        [FromQuery] int limit = 50,
        CancellationToken cancellationToken = default)
    {
        limit = Math.Clamp(limit, 1, 100);
        var jobs = await _db.TranslationJobs
            .AsNoTracking()
            .Include(x => x.Batches)
            .OrderByDescending(x => x.CreatedAt)
            .Take(limit)
            .ToListAsync(cancellationToken);
        return jobs.Select(ToDto).ToList();
    }

    [HttpGet("{id:guid}")]
    [Authorize]
    public async Task<ActionResult<TranslationJobDto>> Get(
        Guid id,
        CancellationToken cancellationToken)
    {
        var job = await _db.TranslationJobs
            .AsNoTracking()
            .Include(x => x.Items)
            .Include(x => x.Batches)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        return job is null ? NotFound() : ToDto(job);
    }

    [HttpGet("{id:guid}/batches")]
    [Authorize]
    public async Task<ActionResult<IReadOnlyList<TranslationBatchDto>>> Batches(
        Guid id,
        CancellationToken cancellationToken)
    {
        if (!await _db.TranslationJobs.AnyAsync(x => x.Id == id, cancellationToken))
        {
            return NotFound();
        }

        var batches = await _db.TranslationJobBatches
            .AsNoTracking()
            .Where(x => x.JobId == id)
            .OrderBy(x => x.BatchNumber)
            .Select(x => new TranslationBatchDto(
                x.Id,
                x.BatchNumber,
                x.Status,
                x.ItemCount,
                x.Attempt,
                x.PromptTokens,
                x.CompletionTokens,
                x.ReasoningTokens,
                x.TotalTokens,
                x.DurationMs,
                x.OpenAiRequestId,
                x.Error,
                x.StartedAt,
                x.CompletedAt))
            .ToListAsync(cancellationToken);
        return batches;
    }

    [HttpPost("{id:guid}/pause")]
    [Authorize]
    public Task<ActionResult<TranslationJobDto>> Pause(
        Guid id,
        CancellationToken cancellationToken) =>
        Transition(id, TranslationJobStatus.PauseRequested, cancellationToken);

    [HttpPost("{id:guid}/resume")]
    [Authorize]
    public Task<ActionResult<TranslationJobDto>> Resume(
        Guid id,
        CancellationToken cancellationToken) =>
        Transition(id, TranslationJobStatus.Running, cancellationToken);

    [HttpPost("{id:guid}/cancel")]
    [Authorize]
    public Task<ActionResult<TranslationJobDto>> Cancel(
        Guid id,
        CancellationToken cancellationToken) =>
        Transition(id, TranslationJobStatus.CancelRequested, cancellationToken);

    [HttpPost("worker/claim")]
    [AllowAnonymous]
    public async Task<ActionResult<TranslationWorkerJobDto>> Claim(
        CancellationToken cancellationToken)
    {
        if (!IsWorkerAuthorized())
        {
            return Unauthorized();
        }

        var now = DateTimeOffset.UtcNow;
        var staleBefore = now.AddMinutes(-10);
        await using var transaction = await _db.Database.BeginTransactionAsync(
            IsolationLevel.ReadCommitted,
            cancellationToken);
        await _db.Database.ExecuteSqlRawAsync(
            $"SELECT pg_advisory_xact_lock({AdvisoryLockKey})",
            cancellationToken);
        await _db.TranslationJobItems
            .Where(x => x.Status == TranslationJobItemStatus.Processing && x.StartedAt < staleBefore)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(x => x.Status, TranslationJobItemStatus.Pending)
                .SetProperty(x => x.LastError, "Воркер перезапущен, элемент возвращён в очередь."), cancellationToken);
        await _db.TranslationJobBatches
            .Where(x => x.Status == TranslationJobBatchStatus.Running
                && x.StartedAt != null
                && x.StartedAt < staleBefore)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(x => x.Status, TranslationJobBatchStatus.Pending)
                .SetProperty(x => x.Error, "Воркер перезапущен, батч возвращён в очередь."), cancellationToken);

        var job = await _db.TranslationJobs
            .Where(x => x.Status == TranslationJobStatus.Pending || x.Status == TranslationJobStatus.Running)
            .OrderBy(x => x.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
        if (job is null)
        {
            await transaction.CommitAsync(cancellationToken);
            return NoContent();
        }

        if (job.Status == TranslationJobStatus.Pending)
        {
            job.Status = TranslationJobStatus.Running;
            job.StartedAt ??= now;
            job.UpdatedAt = now;
            await _db.SaveChangesAsync(cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);
        return new TranslationWorkerJobDto(
            job.Id,
            job.Scope,
            job.Status,
            job.Parallelism,
            job.BatchSize,
            job.Model);
    }

    [HttpPost("worker/{id:guid}/batch/claim")]
    [AllowAnonymous]
    public async Task<ActionResult<TranslationWorkerBatchDto>> ClaimBatch(
        Guid id,
        CancellationToken cancellationToken)
    {
        if (!IsWorkerAuthorized())
        {
            return Unauthorized();
        }

        await using var transaction = await _db.Database.BeginTransactionAsync(
            IsolationLevel.ReadCommitted,
            cancellationToken);
        await _db.Database.ExecuteSqlRawAsync(
            $"SELECT pg_advisory_xact_lock({AdvisoryLockKey})",
            cancellationToken);

        var job = await _db.TranslationJobs.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (job is null)
        {
            return NotFound();
        }

        if (job.Status is not (TranslationJobStatus.Running
            or TranslationJobStatus.Pending
            or TranslationJobStatus.PauseRequested
            or TranslationJobStatus.CancelRequested))
        {
            await transaction.CommitAsync(cancellationToken);
            return NoContent();
        }

        var canClaim = job.Status is TranslationJobStatus.Running or TranslationJobStatus.Pending;
        var batch = await _db.TranslationJobBatches
            .Where(x => canClaim
                && x.JobId == id
                && x.Status == TranslationJobBatchStatus.Pending)
            .OrderBy(x => x.BatchNumber)
            .FirstOrDefaultAsync(cancellationToken);
        if (batch is null)
        {
            if (job.Status == TranslationJobStatus.PauseRequested
                && !await _db.TranslationJobBatches.AnyAsync(
                    x => x.JobId == id && x.Status == TranslationJobBatchStatus.Running,
                    cancellationToken))
            {
                job.Status = TranslationJobStatus.Paused;
                job.UpdatedAt = DateTimeOffset.UtcNow;
                await _db.SaveChangesAsync(cancellationToken);
            }
            else if (job.Status == TranslationJobStatus.CancelRequested
                && !await _db.TranslationJobBatches.AnyAsync(
                    x => x.JobId == id && x.Status == TranslationJobBatchStatus.Running,
                    cancellationToken))
            {
                job.Status = TranslationJobStatus.Cancelled;
                job.CompletedAt = DateTimeOffset.UtcNow;
                job.UpdatedAt = job.CompletedAt.Value;
                await _db.SaveChangesAsync(cancellationToken);
            }

            await transaction.CommitAsync(cancellationToken);
            return NoContent();
        }

        var now = DateTimeOffset.UtcNow;
        batch.Status = TranslationJobBatchStatus.Running;
        batch.Attempt++;
        batch.StartedAt = now;
        batch.Error = null;
        await _db.TranslationJobItems
            .Where(x => x.BatchId == batch.Id && x.Status == TranslationJobItemStatus.Pending)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(x => x.Status, TranslationJobItemStatus.Processing)
                .SetProperty(x => x.StartedAt, now)
                .SetProperty(x => x.Attempts, x => x.Attempts + 1), cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return new TranslationWorkerBatchDto(batch.Id, batch.BatchNumber, batch.Attempt, batch.ItemCount);
    }

    [HttpGet("worker/{id:guid}/batch/{batchId:guid}/items")]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<TranslationSourceDto>>> BatchItems(
        Guid id,
        Guid batchId,
        CancellationToken cancellationToken)
    {
        if (!IsWorkerAuthorized())
        {
            return Unauthorized();
        }

        var batch = await _db.TranslationJobBatches
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == batchId && x.JobId == id, cancellationToken);
        if (batch is null)
        {
            return NotFound();
        }

        if (batch.Status is TranslationJobBatchStatus.Completed or TranslationJobBatchStatus.Failed)
        {
            return NoContent();
        }

        if (batch.Status != TranslationJobBatchStatus.Running)
        {
            return Conflict(new ProblemDetails { Detail = "Батч не находится в состоянии выполнения." });
        }

        var items = await _db.TranslationJobItems
            .AsNoTracking()
            .Where(x => x.JobId == id
                && x.BatchId == batchId
                && x.Status == TranslationJobItemStatus.Processing)
            .OrderBy(x => x.CreatedAt)
            .Take(batch.ItemCount)
            .Select(x => new TranslationSourceDto(x.ProductId, x.OriginalName ?? ""))
            .ToListAsync(cancellationToken);
        return items;
    }

    [HttpPost("worker/{id:guid}/batch/{batchId:guid}/complete")]
    [AllowAnonymous]
    public async Task<IActionResult> CompleteBatch(
        Guid id,
        Guid batchId,
        [FromBody] CompleteTranslationBatchRequest request,
        CancellationToken cancellationToken)
    {
        if (!IsWorkerAuthorized())
        {
            return Unauthorized();
        }

        var batch = await _db.TranslationJobBatches
            .FirstOrDefaultAsync(x => x.Id == batchId && x.JobId == id, cancellationToken);
        if (batch is null)
        {
            return NotFound();
        }

        var items = await _db.TranslationJobItems
            .Where(x => x.JobId == id && x.BatchId == batchId)
            .ToListAsync(cancellationToken);
        var failedItems = 0;
        foreach (var item in items)
        {
            var translation = request.Items.FirstOrDefault(x => x.Id == item.ProductId);
            if (translation is null || string.IsNullOrWhiteSpace(translation.NameRu))
            {
                item.Status = TranslationJobItemStatus.Failed;
                item.LastError = "Пустой перевод.";
                failedItems++;
                continue;
            }

            item.Status = TranslationJobItemStatus.Completed;
            item.TranslatedName = translation.NameRu.Trim();
            item.CompletedAt = DateTimeOffset.UtcNow;
        }

        batch.Status = request.FailedCount > 0 || failedItems > 0
            ? TranslationJobBatchStatus.Failed
            : TranslationJobBatchStatus.Completed;
        batch.PromptTokens = request.PromptTokens;
        batch.CompletionTokens = request.CompletionTokens;
        batch.ReasoningTokens = request.ReasoningTokens;
        batch.TotalTokens = request.TotalTokens;
        batch.DurationMs = request.DurationMs;
        batch.OpenAiRequestId = request.OpenAiRequestId;
        batch.Error = request.Error;
        batch.CompletedAt = DateTimeOffset.UtcNow;

        var now = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        await RecalculateJobAsync(id, now, cancellationToken);
        return NoContent();
    }

    [HttpPost("worker/{id:guid}/complete")]
    [AllowAnonymous]
    public async Task<IActionResult> CompleteJob(
        Guid id,
        CancellationToken cancellationToken)
    {
        if (!IsWorkerAuthorized())
        {
            return Unauthorized();
        }

        await RecalculateJobAsync(id, DateTimeOffset.UtcNow, cancellationToken, finalize: true);
        return NoContent();
    }

    [HttpPost("worker/{id:guid}/fail")]
    [AllowAnonymous]
    public async Task<IActionResult> FailJob(
        Guid id,
        [FromBody] WorkerFailureRequest request,
        CancellationToken cancellationToken)
    {
        if (!IsWorkerAuthorized())
        {
            return Unauthorized();
        }

        var job = await _db.TranslationJobs.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (job is null)
        {
            return NotFound();
        }

        job.Status = TranslationJobStatus.Failed;
        job.LastError = request.Error;
        job.CompletedAt = DateTimeOffset.UtcNow;
        job.UpdatedAt = job.CompletedAt.Value;
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpPost("worker/products/source")]
    [HttpPost("~/api/internal/products/translation-source")]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<TranslationSourceDto>>> Source(
        [FromBody] TranslationSourceRequest request,
        CancellationToken cancellationToken)
    {
        if (!IsWorkerAuthorized())
        {
            return Unauthorized();
        }

        var ids = request.Ids.Distinct().Take(DefaultBatchSize).ToArray();
        var products = await _db.Products
            .AsNoTracking()
            .Where(x => ids.Contains(x.Id))
            .Select(x => new TranslationSourceDto(x.Id, x.Name))
            .ToListAsync(cancellationToken);
        return products;
    }

    [HttpPut("worker/products/translations")]
    [HttpPut("~/api/internal/products/translations")]
    [AllowAnonymous]
    public async Task<ActionResult<SaveTranslationResult>> SaveTranslations(
        [FromBody] SaveTranslationRequest request,
        CancellationToken cancellationToken)
    {
        if (!IsWorkerAuthorized())
        {
            return Unauthorized();
        }

        var values = request.Items
            .Where(x => !string.IsNullOrWhiteSpace(x.NameRu))
            .GroupBy(x => x.Id)
            .ToDictionary(x => x.Key, x => x.Last().NameRu.Trim());
        var products = await _db.Products
            .Where(x => values.Keys.Contains(x.Id))
            .ToListAsync(cancellationToken);
        var now = DateTimeOffset.UtcNow;
        var updated = 0;
        foreach (var product in products)
        {
            if (request.OnlyIfUntranslated && !string.IsNullOrWhiteSpace(product.NameRu))
            {
                continue;
            }

            product.NameRu = values[product.Id];
            product.UpdatedAt = now;
            updated++;
        }

        await _db.SaveChangesAsync(cancellationToken);
        return new SaveTranslationResult(updated, values.Count - products.Count);
    }

    private async Task<ActionResult<TranslationJobDto>> Transition(
        Guid id,
        TranslationJobStatus target,
        CancellationToken cancellationToken)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync(
            IsolationLevel.ReadCommitted,
            cancellationToken);
        await _db.Database.ExecuteSqlRawAsync(
            $"SELECT pg_advisory_xact_lock({AdvisoryLockKey})",
            cancellationToken);
        var job = await _db.TranslationJobs
            .Include(x => x.Batches)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (job is null)
        {
            return NotFound();
        }

        var allowed = target switch
        {
            TranslationJobStatus.PauseRequested => job.Status is TranslationJobStatus.Pending or TranslationJobStatus.Running,
            TranslationJobStatus.Running => job.Status == TranslationJobStatus.Paused,
            TranslationJobStatus.CancelRequested => job.Status is TranslationJobStatus.Pending
                or TranslationJobStatus.Running
                or TranslationJobStatus.PauseRequested
                or TranslationJobStatus.Paused,
            _ => false,
        };
        if (!allowed)
        {
            return Conflict(new ProblemDetails { Detail = $"Переход {job.Status} -> {target} запрещён." });
        }

        if (target == TranslationJobStatus.PauseRequested
            && job.Status == TranslationJobStatus.Pending)
        {
            target = TranslationJobStatus.Paused;
        }

        if (target == TranslationJobStatus.CancelRequested
            && job.Status == TranslationJobStatus.Pending)
        {
            target = TranslationJobStatus.Cancelled;
            job.CompletedAt = DateTimeOffset.UtcNow;
        }

        job.Status = target;
        job.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return ToDto(job);
    }

    private async Task RecalculateJobAsync(
        Guid id,
        DateTimeOffset now,
        CancellationToken cancellationToken,
        bool finalize = false)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync(
            IsolationLevel.ReadCommitted,
            cancellationToken);
        await _db.Database.ExecuteSqlRawAsync(
            $"SELECT pg_advisory_xact_lock({AdvisoryLockKey})",
            cancellationToken);
        var job = await _db.TranslationJobs.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (job is null)
        {
            await transaction.CommitAsync(cancellationToken);
            return;
        }

        var counts = await _db.TranslationJobItems
            .Where(x => x.JobId == id)
            .GroupBy(x => x.Status)
            .Select(x => new { Status = x.Key, Count = x.Count() })
            .ToDictionaryAsync(x => x.Status, x => x.Count, cancellationToken);
        job.SucceededItems = counts.GetValueOrDefault(TranslationJobItemStatus.Completed);
        job.FailedItems = counts.GetValueOrDefault(TranslationJobItemStatus.Failed);
        job.ProcessedItems = job.SucceededItems + job.FailedItems;
        if (job.FailedItems > 0)
        {
            job.LastError = await _db.TranslationJobBatches
                .Where(x => x.JobId == id
                    && x.Status == TranslationJobBatchStatus.Failed
                    && x.Error != null)
                .OrderByDescending(x => x.CompletedAt)
                .Select(x => x.Error)
                .FirstOrDefaultAsync(cancellationToken);
        }
        else
        {
            job.LastError = null;
        }

        var totals = await _db.TranslationJobBatches
            .Where(x => x.JobId == id)
            .GroupBy(_ => 1)
            .Select(x => new
            {
                Prompt = x.Sum(y => y.PromptTokens),
                Completion = x.Sum(y => y.CompletionTokens),
                Reasoning = x.Sum(y => y.ReasoningTokens),
                Total = x.Sum(y => y.TotalTokens),
            })
            .FirstOrDefaultAsync(cancellationToken);
        job.PromptTokens = totals?.Prompt ?? 0;
        job.CompletionTokens = totals?.Completion ?? 0;
        job.ReasoningTokens = totals?.Reasoning ?? 0;
        job.TotalTokens = totals?.Total ?? 0;
        if (job.Status == TranslationJobStatus.PauseRequested
            && !await _db.TranslationJobBatches.AnyAsync(
                x => x.JobId == id && x.Status == TranslationJobBatchStatus.Running,
                cancellationToken))
        {
            job.Status = TranslationJobStatus.Paused;
        }

        if (job.Status == TranslationJobStatus.CancelRequested
            && !await _db.TranslationJobBatches.AnyAsync(
                x => x.JobId == id && x.Status == TranslationJobBatchStatus.Running,
                cancellationToken))
        {
            job.Status = TranslationJobStatus.Cancelled;
            job.CompletedAt = now;
        }

        if ((finalize || job.ProcessedItems >= job.TotalItems)
            && job.Status == TranslationJobStatus.Running)
        {
            job.Status = job.FailedItems == 0
                ? TranslationJobStatus.Completed
                : TranslationJobStatus.CompletedWithErrors;
            job.CompletedAt = now;
        }

        job.UpdatedAt = now;
        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    private bool IsWorkerAuthorized()
    {
        var configured = _configuration["TranslationJobs:WorkerApiKey"]
            ?? _configuration["Crawler:ApiKey"];
        var received = Request.Headers["X-Translation-Worker-Key"].FirstOrDefault()
            ?? Request.Headers["X-Crawler-Key"].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(configured) || string.IsNullOrWhiteSpace(received))
        {
            return false;
        }

        var expectedBytes = Encoding.UTF8.GetBytes(configured);
        var receivedBytes = Encoding.UTF8.GetBytes(received);
        return expectedBytes.Length == receivedBytes.Length
            && CryptographicOperations.FixedTimeEquals(expectedBytes, receivedBytes);
    }

    private static TranslationJobDto ToDto(TranslationJob job)
    {
        var progress = job.TotalItems == 0
            ? 100
            : (int)Math.Round(job.ProcessedItems * 100d / job.TotalItems);
        var end = job.CompletedAt ?? DateTimeOffset.UtcNow;
        var durationMs = job.StartedAt is null
            ? 0
            : Math.Max(0, (long)(end - job.StartedAt.Value).TotalMilliseconds);
        var completedBatches = job.Batches
            .Where(x => x.Status == TranslationJobBatchStatus.Completed && x.DurationMs > 0)
            .ToList();
        var averageBatchDurationMs = completedBatches.Count == 0
            ? 0
            : (long)completedBatches.Average(x => x.DurationMs);
        var itemsPerMinute = durationMs <= 0
            ? 0
            : job.ProcessedItems * 60_000d / durationMs;
        return new TranslationJobDto(
            job.Id,
            job.Scope,
            job.Status,
            job.Parallelism,
            job.BatchSize,
            job.TotalItems,
            job.ProcessedItems,
            job.SucceededItems,
            job.FailedItems,
            progress,
            job.PromptTokens,
            job.CompletionTokens,
            job.ReasoningTokens,
            job.TotalTokens,
            job.Model,
            job.PromptVersion,
            job.CreatedAt,
            job.StartedAt,
            job.CompletedAt,
            durationMs,
            durationMs,
            averageBatchDurationMs,
            itemsPerMinute,
            job.LastError);
    }
}

public sealed record CreateTranslationJobRequest(
    TranslationJobScope Scope,
    IReadOnlyList<Guid>? ProductIds = null,
    int? Parallelism = null);

public sealed record TranslationJobDto(
    Guid Id,
    TranslationJobScope Scope,
    TranslationJobStatus Status,
    int Parallelism,
    int BatchSize,
    int TotalItems,
    int ProcessedItems,
    int SucceededItems,
    int FailedItems,
    int ProgressPercent,
    long PromptTokens,
    long CompletionTokens,
    long ReasoningTokens,
    long TotalTokens,
    string Model,
    string? PromptVersion,
    DateTimeOffset CreatedAt,
    DateTimeOffset? StartedAt,
    DateTimeOffset? CompletedAt,
    long ElapsedMs,
    long DurationMs,
    long AverageBatchDurationMs,
    double ItemsPerMinute,
    string? LastError);

public sealed record TranslationBatchDto(
    Guid Id,
    int BatchNumber,
    TranslationJobBatchStatus Status,
    int ItemCount,
    int Attempt,
    long PromptTokens,
    long CompletionTokens,
    long ReasoningTokens,
    long TotalTokens,
    long DurationMs,
    string? OpenAiRequestId,
    string? Error,
    DateTimeOffset? StartedAt,
    DateTimeOffset? CompletedAt);

public sealed record TranslationWorkerJobDto(
    Guid Id,
    TranslationJobScope Scope,
    TranslationJobStatus Status,
    int Parallelism,
    int BatchSize,
    string Model);

public sealed record TranslationWorkerBatchDto(
    Guid Id,
    int BatchNumber,
    int Attempt,
    int ItemCount);

public sealed record TranslationSourceRequest(IReadOnlyList<Guid> Ids);

public sealed record TranslationSourceDto(Guid Id, string Name);

public sealed record SaveTranslationRequest(
    IReadOnlyList<SaveTranslationItem> Items,
    bool OnlyIfUntranslated = false);

public sealed record SaveTranslationItem(Guid Id, string NameRu);

public sealed record SaveTranslationResult(int Updated, int NotFound);

public sealed record CompleteTranslationBatchRequest(
    IReadOnlyList<SaveTranslationItem> Items,
    long PromptTokens = 0,
    long CompletionTokens = 0,
    long ReasoningTokens = 0,
    long TotalTokens = 0,
    long DurationMs = 0,
    string? OpenAiRequestId = null,
    int FailedCount = 0,
    string? Error = null);

public sealed record WorkerFailureRequest(string Error);
