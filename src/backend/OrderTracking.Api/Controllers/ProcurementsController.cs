using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Domain.Common;
using OrderTracking.Domain;
using OrderTracking.Domain.Entities;
using OrderTracking.Domain.Enums;
using OrderTracking.Infrastructure.Persistence;
using OrderTracking.Infrastructure.ProductPreviews;

namespace OrderTracking.Api.Controllers;

[ApiController]
[Route("api/v1/procurements")]
[Authorize(Roles = "Buyer,Moderator,Admin,SuperAdmin")]
public sealed class ProcurementsController(
    ApplicationDbContext db,
    IObjectStorage? objectStorage = null,
    ILogger<ProcurementsController>? logger = null,
    ProductPreviewQueue? previewQueue = null) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProcurementRowDto>>> GetAll(
        CancellationToken cancellationToken)
    {
        var rows = await ProjectRows(db.OrderItemProcurements
                .AsNoTracking()
                .Where(row => row.CurrentStatus != ProcurementLifecycleStatus.Delivered)
                .OrderByDescending(row => row.CreatedAt))
            .ToListAsync(cancellationToken);

        return Ok(rows.Select(WithLifecycle).ToList());
    }

    [HttpGet("archive")]
    public async Task<ActionResult<IReadOnlyList<ProcurementRowDto>>> GetArchive(CancellationToken cancellationToken)
    {
        var rows = await ProjectRows(db.OrderItemProcurements.AsNoTracking()
                .Where(row => row.CurrentStatus == ProcurementLifecycleStatus.Delivered)
                .OrderByDescending(row => row.UpdatedAt ?? row.CreatedAt))
            .ToListAsync(cancellationToken);
        return Ok(rows.Select(WithLifecycle).ToList());
    }

    [HttpPost("orders/{orderId:guid}/convert")]
    [Authorize(Roles = "Moderator,Admin,SuperAdmin")]
    public async Task<ActionResult<IReadOnlyList<ProcurementRowDto>>> ConvertOrder(
        Guid orderId,
        CancellationToken cancellationToken)
    {
        var order = await db.Orders
            .Include(value => value.Items)
            .FirstOrDefaultAsync(value => value.Id == orderId, cancellationToken);

        if (order is null)
        {
            return NotFound();
        }

        if (order.Items.Count == 0)
        {
            return BadRequest(new { detail = "В заявке нет позиций для формирования заказа." });
        }

        var itemIds = order.Items.Select(item => item.Id).ToList();
        var existingItemIds = await db.OrderItemProcurements
            .Where(value => itemIds.Contains(value.OrderItemId))
            .Select(value => value.OrderItemId)
            .ToListAsync(cancellationToken);

        var existing = existingItemIds.ToHashSet();
        foreach (var item in order.Items.Where(item => !existing.Contains(item.Id)))
        {
            db.OrderItemProcurements.Add(new OrderItemProcurement
            {
                Id = Guid.NewGuid(),
                OrderItemId = item.Id,
                CurrentStatus = ProcurementLifecycleStatus.RequiredPurchase,
                StatusHistory =
                {
                    new OrderItemProcurementStatusHistory
                    {
                        Id = Guid.NewGuid(),
                        Status = ProcurementLifecycleStatus.RequiredPurchase,
                        ChangedAt = DateTimeOffset.UtcNow,
                        ChangedByAdminId = GetAuthorId(),
                        Comment = "Order converted to procurement",
                    },
                },
            });
        }

        order.Status = OrderStatus.InProgress;
        await db.SaveChangesAsync(cancellationToken);

        if (previewQueue is not null)
        {
            foreach (var item in order.Items.Where(item => item.ManualImageObjectKey is null && item.PreviewImageObjectKey is null))
            {
                previewQueue.TryEnqueue(item.Id, item.SourceUrl);
            }
        }

        var rows = await ProjectRows(db.OrderItemProcurements
                .AsNoTracking()
                .Where(row => row.OrderItem.OrderId == orderId)
                .OrderBy(row => row.OrderItem.Name))
            .ToListAsync(cancellationToken);

        return Ok(rows.Select(WithLifecycle).ToList());
    }

    [HttpPost("{id:guid}/transition")]
    public async Task<ActionResult<ProcurementRowDto>> Transition(
        Guid id,
        [FromBody] TransitionProcurementRequest request,
        CancellationToken cancellationToken)
    {
        var row = await db.OrderItemProcurements
            .Include(value => value.OrderItem).ThenInclude(value => value.Order)
            .Include(value => value.Errors)
            .FirstOrDefaultAsync(value => value.Id == id, cancellationToken);
        if (row is null) return NotFound();
        var targetStatus = request.Status ?? ProcurementLifecycle.TargetForStage(row.CurrentStatus, request.TargetStage ?? string.Empty);
        if (targetStatus is null || !ProcurementLifecycle.CanTransition(row.CurrentStatus, targetStatus.Value))
            return BadRequest(new { detail = "Недопустимый переход статуса товара." });

        var isForward = ProcurementLifecycle.Next(row.CurrentStatus) == targetStatus;
        if (isForward && row.Errors.Any(value => value.IsBlocking && !value.IsResolved))
            return Conflict(new { detail = "Сначала разрешите блокирующие ошибки товара." });

        var previous = row.CurrentStatus;
        row.CurrentStatus = targetStatus.Value;
        row.UpdatedAt = DateTimeOffset.UtcNow;
        row.OrderItem.Order.UpdatedAt = DateTimeOffset.UtcNow;
        if (targetStatus != ProcurementLifecycleStatus.RequiredPurchase)
            row.OrderItem.Order.Status = OrderStatus.InProgress;
        db.OrderItemProcurementStatusHistories.Add(new OrderItemProcurementStatusHistory
        {
            Id = Guid.NewGuid(),
            ProcurementId = row.Id,
            PreviousStatus = previous,
            Status = targetStatus.Value,
            ChangedAt = DateTimeOffset.UtcNow,
            ChangedByAdminId = GetAuthorId(),
        });
        await db.SaveChangesAsync(cancellationToken);
        var transitioned = await ProjectRows(db.OrderItemProcurements.AsNoTracking().Where(value => value.Id == id)).FirstAsync(cancellationToken);
        return Ok(WithLifecycle(transitioned));
    }

    [HttpGet("{id:guid}/history")]
    public async Task<ActionResult<IReadOnlyList<ProcurementStatusHistoryDto>>> GetStatusHistory(Guid id, CancellationToken cancellationToken)
    {
        if (!await db.OrderItemProcurements.AnyAsync(value => value.Id == id, cancellationToken)) return NotFound();
        return Ok(await db.OrderItemProcurementStatusHistories.AsNoTracking()
            .Where(value => value.ProcurementId == id).OrderBy(value => value.ChangedAt)
            .Select(value => new ProcurementStatusHistoryDto(value.Id, value.PreviousStatus, value.Status, value.ChangedAt, value.ChangedByAdminId, value.Comment))
            .ToListAsync(cancellationToken));
    }

    [HttpGet("{id:guid}/errors")]
    public async Task<ActionResult<IReadOnlyList<ProcurementErrorDto>>> GetErrors(Guid id, CancellationToken cancellationToken)
    {
        if (!await db.OrderItemProcurements.AnyAsync(value => value.Id == id, cancellationToken)) return NotFound();
        return Ok(await db.OrderItemProcurementErrors.AsNoTracking().Where(value => value.ProcurementId == id)
            .OrderBy(value => value.CreatedAt)
            .Select(value => new ProcurementErrorDto(value.Id, value.ProcurementId, value.Text, value.StatusAtCreation, value.StageAtCreation, value.CreatedAt, value.AuthorId, value.IsBlocking, value.IsResolved, value.ResolvedAt, value.ResolvedByAdminId))
            .ToListAsync(cancellationToken));
    }

    [HttpPost("{id:guid}/errors")]
    public async Task<ActionResult<ProcurementErrorDto>> CreateError(Guid id, [FromBody] CreateProcurementErrorRequest request, CancellationToken cancellationToken)
    {
        var row = await db.OrderItemProcurements.FirstOrDefaultAsync(value => value.Id == id, cancellationToken);
        if (row is null) return NotFound();
        if (string.IsNullOrWhiteSpace(request.Text)) return BadRequest(new { detail = "Укажите описание ошибки." });
        var error = new OrderItemProcurementError
        {
            Id = Guid.NewGuid(), ProcurementId = id, Text = request.Text.Trim(), StatusAtCreation = row.CurrentStatus,
            StageAtCreation = ProcurementLifecycle.Stage(row.CurrentStatus), CreatedAt = DateTimeOffset.UtcNow,
            AuthorId = GetAuthorId(), IsBlocking = request.IsBlocking,
        };
        db.OrderItemProcurementErrors.Add(error);
        await db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetErrors), new { id }, ToErrorDto(error));
    }

    [HttpPost("errors/{errorId:guid}/resolve")]
    public async Task<ActionResult<ProcurementErrorDto>> ResolveError(Guid errorId, CancellationToken cancellationToken)
    {
        var error = await db.OrderItemProcurementErrors.FirstOrDefaultAsync(value => value.Id == errorId, cancellationToken);
        if (error is null) return NotFound();
        if (!error.IsResolved)
        {
            error.IsResolved = true;
            error.ResolvedAt = DateTimeOffset.UtcNow;
            error.ResolvedByAdminId = GetAuthorId();
            await db.SaveChangesAsync(cancellationToken);
        }
        return Ok(ToErrorDto(error));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ProcurementRowDto>> Update(
        Guid id,
        [FromBody] UpdateProcurementRequest request,
        CancellationToken cancellationToken)
    {
        var row = await db.OrderItemProcurements
            .Include(value => value.Attachments)
            .Include(value => value.OrderItem)
            .ThenInclude(value => value.Order)
            .FirstOrDefaultAsync(value => value.Id == id, cancellationToken);

        if (row is null)
        {
            return NotFound();
        }

        var oldPurchaseUrl = row.PurchaseUrl;
        var oldPreviewObjectKey = row.OrderItem.PreviewImageObjectKey;
        row.PurchaseUrl = Normalize(request.PurchaseUrl);
        var purchaseUrlChanged = !string.Equals(oldPurchaseUrl, row.PurchaseUrl, StringComparison.Ordinal);
        if (purchaseUrlChanged)
        {
            row.OrderItem.PreviewImageObjectKey = null;
            row.OrderItem.PreviewImageContentType = null;
            row.OrderItem.PreviewImageSource = null;
            row.OrderItem.PreviewSourceUrl = null;
            row.OrderItem.PreviewFetchedAt = null;
        }
        row.PurchasePrice = request.PurchasePrice;
        row.PurchaseCurrencyCode = NormalizeCurrency(request.PurchaseCurrencyCode);
        row.SellerOrderNumber = Normalize(request.SellerOrderNumber);
        row.WarehouseTrackingNumber = Normalize(request.WarehouseTrackingNumber);
        row.WarehouseReceivedAt = request.WarehouseReceivedAt;
        row.WarehouseCondition = request.WarehouseCondition;
        row.ShippingTrackingNumber = Normalize(request.ShippingTrackingNumber);
        row.ShippingMethod = Normalize(request.ShippingMethod);
        row.ShippingWeight = request.ShippingWeight;
        row.ShippingCost = request.ShippingCost;
        row.ShippingCurrencyCode = NormalizeCurrency(request.ShippingCurrencyCode);
        row.ShippedAt = request.ShippedAt;

        await db.SaveChangesAsync(cancellationToken);

        if (purchaseUrlChanged && oldPreviewObjectKey is not null && objectStorage is not null)
        {
            try
            {
                await objectStorage.DeleteAsync(oldPreviewObjectKey, cancellationToken);
            }
            catch (Exception exception)
            {
                logger?.LogWarning(exception, "Could not delete stale product preview {ObjectKey}", oldPreviewObjectKey);
            }
        }

        if (purchaseUrlChanged && row.OrderItem.ManualImageObjectKey is null)
        {
            previewQueue?.TryEnqueue(row.OrderItemId, row.PurchaseUrl);
        }

        var result = await ProjectRows(db.OrderItemProcurements
                .AsNoTracking()
                .Where(value => value.Id == id))
            .FirstAsync(cancellationToken);

        return Ok(WithLifecycle(result));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var row = await db.OrderItemProcurements
            .Include(value => value.Attachments)
            .Include(value => value.OrderItem)
            .ThenInclude(value => value.Order)
            .FirstOrDefaultAsync(value => value.Id == id, cancellationToken);

        if (row is null)
        {
            return NotFound();
        }

        var objectKeys = row.Attachments.Select(value => value.ObjectKey).ToList();
        // Removing a procurement entry does not delete the product or its order. Return the
        // order to the state where it can be sent to procurement again.
        row.OrderItem.Order.Status = OrderStatus.AwaitingPayment;
        row.OrderItem.Order.UpdatedAt = DateTimeOffset.UtcNow;
        db.OrderItemProcurementAttachments.RemoveRange(row.Attachments);
        db.OrderItemProcurements.Remove(row);
        await db.SaveChangesAsync(cancellationToken);

        if (objectStorage is not null)
        {
            foreach (var objectKey in objectKeys)
            {
                try
                {
                    await objectStorage.DeleteAsync(objectKey, cancellationToken);
                }
                catch (Exception exception)
                {
                    logger?.LogWarning(
                        exception,
                        "Could not delete procurement attachment {ObjectKey}",
                        objectKey);
                }
            }
        }

        return NoContent();
    }

    private static IQueryable<ProcurementRowDto> ProjectRows(
        IQueryable<OrderItemProcurement> query) =>
        query.Select(value => new ProcurementRowDto(
            value.Id,
            value.OrderItem.OrderId,
            value.OrderItem.Order.TrackingCode,
            value.OrderItemId,
            value.OrderItem.Name,
            value.OrderItem.SourceUrl,
            value.OrderItem.ManualImageObjectKey != null
                ? $"/api/v1/order-items/{value.OrderItemId}/image"
                : value.OrderItem.ImageUrl ?? (value.OrderItem.PreviewImageObjectKey != null
                    ? $"/api/v1/order-items/{value.OrderItemId}/image"
                    : null),
            value.OrderItem.ManualImageObjectKey != null,
            value.OrderItem.PreviewImageObjectKey != null,
            value.OrderItem.PreviewImageSource,
            value.OrderItem.Description,
            value.OrderItem.ShopName,
            value.OrderItem.ProductSource,
            value.OrderItem.UnitPrice,
            value.OrderItem.CurrencyCode,
            value.OrderItem.SortOrder,
            value.PurchaseUrl,
            value.CurrentStatus,
            value.PurchasePrice,
            value.PurchaseCurrencyCode,
            value.SellerOrderNumber,
            value.WarehouseTrackingNumber,
            value.WarehouseReceivedAt,
            value.WarehouseCondition,
            value.ShippingTrackingNumber,
            value.ShippingMethod,
            value.ShippingWeight,
            value.ShippingCost,
            value.ShippingCurrencyCode,
            value.ShippedAt,
            value.Attachments
                .OrderBy(attachment => attachment.CreatedAt)
                .Select(attachment => new ProcurementAttachmentDto(
                    attachment.Id,
                    attachment.Kind,
                    attachment.OriginalFileName,
                    attachment.ContentType,
                    attachment.SizeBytes,
                    $"/api/v1/procurements/attachments/{attachment.Id}"))
                .ToList(),
            value.Errors.Count(error => !error.IsResolved),
            string.Empty,
            null,
            null,
            null,
            null,
            value.CreatedAt,
            value.UpdatedAt ?? value.CreatedAt));

    private Guid? GetAuthorId()
    {
        var principal = ControllerContext?.HttpContext?.User;
        if (principal is null) return null;
        var value = principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? principal.FindFirstValue("sub");
        return Guid.TryParse(value, out var id) ? id : null;
    }

    private static ProcurementRowDto WithLifecycle(ProcurementRowDto row) => row with
    {
        Stage = ProcurementLifecycle.Stage(row.Status),
        NextStatus = ProcurementLifecycle.Next(row.Status),
        PreviousStatus = ProcurementLifecycle.Previous(row.Status),
        NextStage = ProcurementLifecycle.Next(row.Status) is { } next ? ProcurementLifecycle.Stage(next) : null,
        PreviousStage = ProcurementLifecycle.Previous(row.Status) is { } previous ? ProcurementLifecycle.Stage(previous) : null,
    };

    private static ProcurementErrorDto ToErrorDto(OrderItemProcurementError value) => new(
        value.Id, value.ProcurementId, value.Text, value.StatusAtCreation, value.StageAtCreation,
        value.CreatedAt, value.AuthorId, value.IsBlocking, value.IsResolved, value.ResolvedAt, value.ResolvedByAdminId);

    private static string? Normalize(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string NormalizeCurrency(string? value)
    {
        var normalized = CurrencyCodes.Normalize(value);
        return normalized is CurrencyCodes.Jpy or CurrencyCodes.Rub or CurrencyCodes.Usd or CurrencyCodes.Eur
            ? normalized
            : CurrencyCodes.Jpy;
    }
}

public sealed record ProcurementRowDto(
    Guid Id,
    Guid OrderId,
    string TrackingCode,
    Guid OrderItemId,
    string ItemName,
    string? ProductUrl,
    string? ProductImageUrl,
    bool HasManualImage,
    bool HasPreviewImage,
    string? PreviewImageSource,
    string? ItemDescription,
    string? ShopName,
    string ProductSource,
    decimal? UnitPrice,
    string? ItemCurrencyCode,
    int SortOrder,
    string? PurchaseUrl,
    ProcurementLifecycleStatus Status,
    decimal? PurchasePrice,
    string PurchaseCurrencyCode,
    string? SellerOrderNumber,
    string? WarehouseTrackingNumber,
    DateOnly? WarehouseReceivedAt,
    WarehouseCondition? WarehouseCondition,
    string? ShippingTrackingNumber,
    string? ShippingMethod,
    decimal? ShippingWeight,
    decimal? ShippingCost,
    string ShippingCurrencyCode,
    DateOnly? ShippedAt,
    IReadOnlyList<ProcurementAttachmentDto> Attachments,
    int OpenErrorCount,
    string Stage,
    ProcurementLifecycleStatus? NextStatus,
    ProcurementLifecycleStatus? PreviousStatus,
    string? NextStage,
    string? PreviousStage,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record UpdateProcurementRequest(
    string? PurchaseUrl,
    decimal? PurchasePrice,
    string? PurchaseCurrencyCode,
    string? SellerOrderNumber,
    string? WarehouseTrackingNumber,
    DateOnly? WarehouseReceivedAt,
    WarehouseCondition? WarehouseCondition,
    string? ShippingTrackingNumber,
    string? ShippingMethod,
    decimal? ShippingWeight,
    decimal? ShippingCost,
    string? ShippingCurrencyCode,
    DateOnly? ShippedAt);

public sealed record TransitionProcurementRequest(ProcurementLifecycleStatus? Status = null, string? TargetStage = null);
public sealed record CreateProcurementErrorRequest(string Text, bool IsBlocking = true);
public sealed record ProcurementErrorDto(Guid Id, Guid ProcurementId, string Text, ProcurementLifecycleStatus StatusAtCreation, string StageAtCreation, DateTimeOffset CreatedAt, Guid? AuthorId, bool IsBlocking, bool IsResolved, DateTimeOffset? ResolvedAt, Guid? ResolvedByAdminId);
public sealed record ProcurementStatusHistoryDto(Guid Id, ProcurementLifecycleStatus? PreviousStatus, ProcurementLifecycleStatus Status, DateTimeOffset ChangedAt, Guid? ChangedByAdminId, string? Comment);

public sealed record ProcurementAttachmentDto(
    Guid Id,
    ProcurementAttachmentKind Kind,
    string? FileName,
    string ContentType,
    long SizeBytes,
    string Url);
