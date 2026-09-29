using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Domain.Common;
using OrderTracking.Domain.Entities;
using OrderTracking.Domain.Enums;
using OrderTracking.Infrastructure.Persistence;

namespace OrderTracking.Api.Controllers;

[ApiController]
[Route("api/v1/procurements")]
[Authorize(Roles = "Buyer,Moderator,Admin,SuperAdmin")]
public sealed class ProcurementsController(
    ApplicationDbContext db,
    IObjectStorage? objectStorage = null,
    ILogger<ProcurementsController>? logger = null) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProcurementRowDto>>> GetAll(
        CancellationToken cancellationToken)
    {
        var rows = await ProjectRows(db.OrderItemProcurements
                .AsNoTracking()
                .OrderByDescending(row => row.CreatedAt))
            .ToListAsync(cancellationToken);

        return Ok(rows);
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
            });
        }

        order.Status = OrderStatus.InProgress;
        await db.SaveChangesAsync(cancellationToken);

        var rows = await ProjectRows(db.OrderItemProcurements
                .AsNoTracking()
                .Where(row => row.OrderItem.OrderId == orderId)
                .OrderBy(row => row.OrderItem.Name))
            .ToListAsync(cancellationToken);

        return Ok(rows);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ProcurementRowDto>> Update(
        Guid id,
        [FromBody] UpdateProcurementRequest request,
        CancellationToken cancellationToken)
    {
        var row = await db.OrderItemProcurements
            .Include(value => value.Attachments)
            .FirstOrDefaultAsync(value => value.Id == id, cancellationToken);

        if (row is null)
        {
            return NotFound();
        }

        row.PurchaseUrl = Normalize(request.PurchaseUrl);
        row.PurchaseStatus = request.PurchaseStatus;
        row.PurchasePrice = request.PurchasePrice;
        row.PurchaseCurrencyCode = NormalizeCurrency(request.PurchaseCurrencyCode);
        row.SellerOrderNumber = Normalize(request.SellerOrderNumber);
        row.WarehouseTrackingNumber = Normalize(request.WarehouseTrackingNumber);
        row.ArrivalStatus = request.ArrivalStatus;
        row.WarehouseReceivedAt = request.WarehouseReceivedAt;
        row.WarehouseCondition = request.WarehouseCondition;
        row.ShippingTrackingNumber = Normalize(request.ShippingTrackingNumber);
        row.ShipmentStatus = request.ShipmentStatus;
        row.ShippingMethod = Normalize(request.ShippingMethod);
        row.ShippingWeight = request.ShippingWeight;
        row.ShippingCost = request.ShippingCost;
        row.ShippingCurrencyCode = NormalizeCurrency(request.ShippingCurrencyCode);
        row.ShippedAt = request.ShippedAt;

        await db.SaveChangesAsync(cancellationToken);

        var result = await ProjectRows(db.OrderItemProcurements
                .AsNoTracking()
                .Where(value => value.Id == id))
            .FirstAsync(cancellationToken);

        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var row = await db.OrderItemProcurements
            .Include(value => value.Attachments)
            .FirstOrDefaultAsync(value => value.Id == id, cancellationToken);

        if (row is null)
        {
            return NotFound();
        }

        var objectKeys = row.Attachments.Select(value => value.ObjectKey).ToList();
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
            value.OrderItem.ImageUrl,
            value.PurchaseUrl,
            value.PurchaseStatus,
            value.PurchasePrice,
            value.PurchaseCurrencyCode,
            value.SellerOrderNumber,
            value.WarehouseTrackingNumber,
            value.ArrivalStatus,
            value.WarehouseReceivedAt,
            value.WarehouseCondition,
            value.ShippingTrackingNumber,
            value.ShipmentStatus,
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
            value.CreatedAt,
            value.UpdatedAt ?? value.CreatedAt));

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
    string? PurchaseUrl,
    PurchaseStatus PurchaseStatus,
    decimal? PurchasePrice,
    string PurchaseCurrencyCode,
    string? SellerOrderNumber,
    string? WarehouseTrackingNumber,
    ArrivalStatus ArrivalStatus,
    DateOnly? WarehouseReceivedAt,
    WarehouseCondition? WarehouseCondition,
    string? ShippingTrackingNumber,
    ShipmentStatus ShipmentStatus,
    string? ShippingMethod,
    decimal? ShippingWeight,
    decimal? ShippingCost,
    string ShippingCurrencyCode,
    DateOnly? ShippedAt,
    IReadOnlyList<ProcurementAttachmentDto> Attachments,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record UpdateProcurementRequest(
    string? PurchaseUrl,
    PurchaseStatus PurchaseStatus,
    decimal? PurchasePrice,
    string? PurchaseCurrencyCode,
    string? SellerOrderNumber,
    string? WarehouseTrackingNumber,
    ArrivalStatus ArrivalStatus,
    DateOnly? WarehouseReceivedAt,
    WarehouseCondition? WarehouseCondition,
    string? ShippingTrackingNumber,
    ShipmentStatus ShipmentStatus,
    string? ShippingMethod,
    decimal? ShippingWeight,
    decimal? ShippingCost,
    string? ShippingCurrencyCode,
    DateOnly? ShippedAt);

public sealed record ProcurementAttachmentDto(
    Guid Id,
    ProcurementAttachmentKind Kind,
    string? FileName,
    string ContentType,
    long SizeBytes,
    string Url);
