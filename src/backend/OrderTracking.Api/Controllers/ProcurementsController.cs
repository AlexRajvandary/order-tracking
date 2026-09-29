using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Domain.Entities;
using OrderTracking.Domain.Enums;
using OrderTracking.Infrastructure.Persistence;

namespace OrderTracking.Api.Controllers;

[ApiController]
[Route("api/v1/procurements")]
[Authorize]
public sealed class ProcurementsController(ApplicationDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProcurementRowDto>>> GetAll(
        CancellationToken cancellationToken)
    {
        var rows = await ProjectRows(db.OrderItemProcurements.AsNoTracking())
            .OrderByDescending(row => row.CreatedAt)
            .ToListAsync(cancellationToken);

        return Ok(rows);
    }

    [HttpPost("orders/{orderId:guid}/convert")]
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

        var rows = await ProjectRows(db.OrderItemProcurements.AsNoTracking())
            .Where(row => row.OrderId == orderId)
            .OrderBy(row => row.ItemName)
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
            .FirstOrDefaultAsync(value => value.Id == id, cancellationToken);

        if (row is null)
        {
            return NotFound();
        }

        row.PurchaseUrl = Normalize(request.PurchaseUrl);
        row.PurchaseStatus = request.PurchaseStatus;
        row.ArrivalUrl = Normalize(request.ArrivalUrl);
        row.ArrivalStatus = request.ArrivalStatus;
        row.ShipmentUrl = Normalize(request.ShipmentUrl);
        row.ShipmentStatus = request.ShipmentStatus;

        await db.SaveChangesAsync(cancellationToken);

        var result = await ProjectRows(db.OrderItemProcurements.AsNoTracking())
            .FirstAsync(value => value.Id == id, cancellationToken);

        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var row = await db.OrderItemProcurements
            .FirstOrDefaultAsync(value => value.Id == id, cancellationToken);

        if (row is null)
        {
            return NotFound();
        }

        db.OrderItemProcurements.Remove(row);
        await db.SaveChangesAsync(cancellationToken);
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
            value.PurchaseUrl,
            value.PurchaseStatus,
            value.ArrivalUrl,
            value.ArrivalStatus,
            value.ShipmentUrl,
            value.ShipmentStatus,
            value.CreatedAt,
            value.UpdatedAt ?? value.CreatedAt));

    private static string? Normalize(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public sealed record ProcurementRowDto(
    Guid Id,
    Guid OrderId,
    string TrackingCode,
    Guid OrderItemId,
    string ItemName,
    string? ProductUrl,
    string? PurchaseUrl,
    PurchaseStatus PurchaseStatus,
    string? ArrivalUrl,
    ArrivalStatus ArrivalStatus,
    string? ShipmentUrl,
    ShipmentStatus ShipmentStatus,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record UpdateProcurementRequest(
    string? PurchaseUrl,
    PurchaseStatus PurchaseStatus,
    string? ArrivalUrl,
    ArrivalStatus ArrivalStatus,
    string? ShipmentUrl,
    ShipmentStatus ShipmentStatus);
