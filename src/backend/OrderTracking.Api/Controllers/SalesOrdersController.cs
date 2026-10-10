using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;
using OrderTracking.Domain.Entities;
using OrderTracking.Domain.Enums;
using OrderTracking.Infrastructure.Persistence;
using OrderTracking.Application.Common.Interfaces;

namespace OrderTracking.Api.Controllers;

[ApiController]
[Route("api/v1/sales-orders")]
[Authorize(Roles = "Moderator,Admin,SuperAdmin")]
public sealed class SalesOrdersController(
    ApplicationDbContext db,
    ITrackingCodeGenerator trackingCodes,
    IObjectStorage objectStorage) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<SalesOrderListDto>>> GetAll(CancellationToken cancellationToken)
    {
        var orders = await db.SalesOrders.AsNoTracking()
            .OrderByDescending(order => order.CreatedAt)
            .Select(order => new
            {
                order.Id,
                order.WorkspaceRequestId,
                order.SourceRequest.TrackingCode,
                RequestTrackingCode = order.SourceRequest.TrackingCode,
                CustomerName = order.WorkspaceRequest.Customer != null
                    ? ((order.WorkspaceRequest.Customer.LastName ?? "") + " " +
                       (order.WorkspaceRequest.Customer.FirstName ?? "") + " " +
                       (order.WorkspaceRequest.Customer.Patronymic ?? "")).Trim()
                    : null,
                CustomerPhone = order.WorkspaceRequest.Customer != null ? order.WorkspaceRequest.Customer.Phone : null,
                ItemsCount = order.WorkspaceRequest.Items.Count,
                order.CreatedAt,
                UpdatedAt = order.UpdatedAt ?? order.CreatedAt,
            })
            .ToListAsync(cancellationToken);
        var workspaceIds = orders.Select(order => order.WorkspaceRequestId).ToList();
        var productStatuses = await db.OrderItemProcurements.AsNoTracking()
            .Where(row => workspaceIds.Contains(row.OrderItem.OrderId))
            .Select(row => new { OrderId = row.OrderItem.OrderId, row.CurrentStatus })
            .ToListAsync(cancellationToken);
        var rows = orders.Select(order => new SalesOrderListDto(
            order.Id,
            order.TrackingCode,
            order.RequestTrackingCode,
            order.CustomerName,
            order.CustomerPhone,
            productStatuses.Where(value => value.OrderId == order.WorkspaceRequestId).Select(value => value.CurrentStatus.ToString()).Distinct().ToList(),
            order.ItemsCount,
            order.CreatedAt,
            order.UpdatedAt)).ToList();
        return Ok(rows);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<SalesOrderDetailsDto>> Get(Guid id, CancellationToken cancellationToken)
    {
        var order = await db.SalesOrders.AsNoTracking()
            .Where(value => value.Id == id)
            .Select(value => new SalesOrderDetailsDto(
                value.Id,
                value.SourceRequestId,
                value.WorkspaceRequestId,
                value.SourceRequest.TrackingCode,
                value.SourceRequest.TrackingCode,
                value.WorkspaceRequest.Status.ToString(),
                value.CreatedAt,
                value.UpdatedAt ?? value.CreatedAt))
            .FirstOrDefaultAsync(cancellationToken);
        return order is null ? NotFound() : Ok(order);
    }

    [HttpPost("from-request/{requestId:guid}")]
    public async Task<ActionResult<SalesOrderDetailsDto>> ConvertRequest(Guid requestId, CancellationToken cancellationToken)
    {
        var source = await db.Orders.Include(value => value.Items)
            .FirstOrDefaultAsync(value => value.Id == requestId && !value.IsSalesOrderWorkspace, cancellationToken);
        if (source is null) return NotFound();
        if (source.ConvertedToSalesOrderId is not null)
        {
            return Conflict(new { detail = "Заявка уже конвертирована в заказ." });
        }
        if (source.Items.Count == 0)
        {
            return BadRequest(new { detail = "Нельзя создать заказ без позиций." });
        }

        var orderId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;
        // Keep a private tracking code for the editable workspace row. The public order uses the
        // original request code, which remains stable for customer tracking after conversion.
        var trackingCode = await GenerateTrackingCodeAsync(cancellationToken);
        var workspaceId = Guid.NewGuid();
        var copiedObjectKeys = new List<string>();
        var workspace = new Order
        {
            Id = workspaceId,
            TrackingCode = trackingCode,
            CustomerId = source.CustomerId,
            DeliveryAddressId = source.DeliveryAddressId,
            DeliveryCity = source.DeliveryCity,
            DeliveryStreet = source.DeliveryStreet,
            DeliveryBuilding = source.DeliveryBuilding,
            DeliveryApartment = source.DeliveryApartment,
            DeliveryPostalCode = source.DeliveryPostalCode,
            DeliveryNote = source.DeliveryNote,
            AdminNotes = source.AdminNotes,
            RequestImagesJson = "[]",
            CreatedByAdminId = source.CreatedByAdminId,
            Status = OrderStatus.AwaitingPayment,
            ExpectedDeliveryAt = source.ExpectedDeliveryAt,
            CreatedAt = now,
            IsSalesOrderWorkspace = true,
        };

        try
        {
            var sourceImages = JsonSerializer.Deserialize<IReadOnlyList<TelegramImageAttachment>>(
                source.RequestImagesJson,
                new JsonSerializerOptions(JsonSerializerDefaults.Web)) ?? [];
            var workspaceImages = new List<TelegramImageAttachment>(sourceImages.Count);
            for (var index = 0; index < sourceImages.Count; index++)
            {
                var newKey = await CopyObjectAsync(sourceImages[index].ObjectKey, sourceImages[index].ContentType, workspaceId, "request-images", index, cancellationToken);
                copiedObjectKeys.Add(newKey);
                workspaceImages.Add(sourceImages[index] with { ObjectKey = newKey });
            }
            workspace.RequestImagesJson = JsonSerializer.Serialize(workspaceImages, new JsonSerializerOptions(JsonSerializerDefaults.Web));

            foreach (var item in source.Items.OrderBy(value => value.SortOrder))
            {
                var manualImageKey = await CopyOptionalObjectAsync(item.ManualImageObjectKey, item.ManualImageContentType, workspaceId, "manual-images", item.SortOrder, copiedObjectKeys, cancellationToken);
                var previewImageKey = await CopyOptionalObjectAsync(item.PreviewImageObjectKey, item.PreviewImageContentType, workspaceId, "preview-images", item.SortOrder, copiedObjectKeys, cancellationToken);
                workspace.Items.Add(new OrderItem
                {
                    Id = Guid.NewGuid(),
                    OrderId = workspace.Id,
                    ItemType = item.ItemType,
                    Name = item.Name,
                    Description = item.Description,
                    SourceUrl = item.SourceUrl,
                    ProductSource = item.ProductSource,
                    CatalogProductId = item.CatalogProductId,
                    ExternalProductId = item.ExternalProductId,
                    ImageUrl = item.ImageUrl,
                    ManualImageObjectKey = manualImageKey,
                    ManualImageContentType = item.ManualImageContentType,
                    PreviewImageObjectKey = previewImageKey,
                    PreviewImageContentType = item.PreviewImageContentType,
                    PreviewImageSource = item.PreviewImageSource,
                    PreviewSourceUrl = item.PreviewSourceUrl,
                    PreviewFetchedAt = item.PreviewFetchedAt,
                    AffiliateUrl = item.AffiliateUrl,
                    ShopCode = item.ShopCode,
                    ShopName = item.ShopName,
                    Quantity = item.Quantity,
                    UnitPrice = item.UnitPrice,
                    CurrencyCode = item.CurrencyCode,
                    SortOrder = item.SortOrder,
                    CurrentStatusId = item.CurrentStatusId,
                    CurrentStatusText = item.CurrentStatusText,
                    CurrentStatusUpdatedAt = item.CurrentStatusUpdatedAt,
                    CreatedAt = now,
                });
            }
        }
        catch
        {
            foreach (var objectKey in copiedObjectKeys)
            {
                try { await objectStorage.DeleteAsync(objectKey, CancellationToken.None); }
                catch { /* Keep the conversion error; orphaned copies can be cleaned up later. */ }
            }
            throw;
        }

        var salesOrder = new SalesOrder
        {
            Id = orderId,
            SourceRequestId = source.Id,
            WorkspaceRequestId = workspace.Id,
            CreatedAt = now,
        };
        source.ConvertedToSalesOrderId = orderId;
        db.Orders.Add(workspace);
        db.SalesOrders.Add(salesOrder);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            foreach (var objectKey in copiedObjectKeys)
            {
                try { await objectStorage.DeleteAsync(objectKey, CancellationToken.None); }
                catch { /* Keep the database failure; orphaned copies can be cleaned up later. */ }
            }
            throw;
        }

        return CreatedAtAction(nameof(Get), new { id = orderId }, new SalesOrderDetailsDto(
            orderId, source.Id, workspace.Id, source.TrackingCode, workspace.TrackingCode,
            workspace.Status.ToString(), now, now));
    }

    [HttpPost("{id:guid}/send-to-procurement")]
    public async Task<IActionResult> SendToProcurement(Guid id, CancellationToken cancellationToken)
    {
        var order = await db.SalesOrders.Include(value => value.WorkspaceRequest)
            .ThenInclude(value => value.Items)
            .FirstOrDefaultAsync(value => value.Id == id, cancellationToken);
        if (order is null) return NotFound();
        var workspace = order.WorkspaceRequest;
        if (workspace.Items.Count == 0) return BadRequest(new { detail = "В заказе нет товаров для выкупа." });

        var itemIds = workspace.Items.Select(item => item.Id).ToList();
        var existing = await db.OrderItemProcurements
            .Where(row => itemIds.Contains(row.OrderItemId))
            .Select(row => row.OrderItemId)
            .ToListAsync(cancellationToken);
        var existingIds = existing.ToHashSet();
        foreach (var item in workspace.Items.Where(item => !existingIds.Contains(item.Id)))
        {
            db.OrderItemProcurements.Add(new OrderItemProcurement
            {
                Id = Guid.NewGuid(),
                OrderItemId = item.Id,
                CurrentStatus = ProcurementLifecycleStatus.RequiredPurchase,
                CreatedAt = DateTimeOffset.UtcNow,
                StatusHistory =
                {
                    new OrderItemProcurementStatusHistory
                    {
                        Id = Guid.NewGuid(),
                        Status = ProcurementLifecycleStatus.RequiredPurchase,
                        ChangedAt = DateTimeOffset.UtcNow,
                        ChangedByAdminId = GetAuthorId(),
                        Comment = "Order sent to procurement",
                    },
                },
            });
        }

        workspace.Status = OrderStatus.InProgress;
        workspace.UpdatedAt = DateTimeOffset.UtcNow;
        order.UpdatedAt = workspace.UpdatedAt;
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var order = await db.SalesOrders.Include(value => value.WorkspaceRequest).ThenInclude(value => value.Items)
            .FirstOrDefaultAsync(value => value.Id == id, cancellationToken);
        if (order is null) return NotFound();
        var source = await db.Orders.FirstOrDefaultAsync(value => value.Id == order.SourceRequestId, cancellationToken);
        if (source is not null && source.ConvertedToSalesOrderId == id) source.ConvertedToSalesOrderId = null;
        order.IsDeleted = true;
        order.DeletedAt = DateTimeOffset.UtcNow;
        order.WorkspaceRequest.IsDeleted = true;
        order.WorkspaceRequest.DeletedAt = order.DeletedAt;
        await db.SaveChangesAsync(cancellationToken);

        var objectKeys = order.WorkspaceRequest.Items
            .SelectMany(item => new[] { item.ManualImageObjectKey, item.PreviewImageObjectKey })
            .Where(key => !string.IsNullOrWhiteSpace(key))
            .Cast<string>()
            .ToHashSet(StringComparer.Ordinal);
        var requestImages = JsonSerializer.Deserialize<IReadOnlyList<TelegramImageAttachment>>(
            order.WorkspaceRequest.RequestImagesJson,
            new JsonSerializerOptions(JsonSerializerDefaults.Web)) ?? [];
        foreach (var image in requestImages) objectKeys.Add(image.ObjectKey);
        foreach (var objectKey in objectKeys)
        {
            try { await objectStorage.DeleteAsync(objectKey, cancellationToken); }
            catch { /* The soft-deleted order remains recoverable if object cleanup needs retrying. */ }
        }
        return NoContent();
    }

    private async Task<string> GenerateTrackingCodeAsync(CancellationToken cancellationToken)
    {
        for (var attempt = 0; attempt < 10; attempt++)
        {
            var code = trackingCodes.Generate();
            var exists = await db.Orders.IgnoreQueryFilters().AnyAsync(value => value.TrackingCode == code, cancellationToken);
            if (!exists) return code;
        }
        throw new InvalidOperationException("Could not generate a unique tracking code for the order.");
    }

    private Guid? GetAuthorId()
    {
        var principal = ControllerContext?.HttpContext?.User;
        if (principal is null) return null;
        var value = principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? principal.FindFirstValue("sub");
        return Guid.TryParse(value, out var id) ? id : null;
    }

    private async Task<string?> CopyOptionalObjectAsync(
        string? sourceKey,
        string? contentType,
        Guid workspaceId,
        string folder,
        int index,
        ICollection<string> copiedObjectKeys,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(sourceKey)) return null;
        var copy = await CopyObjectAsync(sourceKey, contentType, workspaceId, folder, index, cancellationToken);
        copiedObjectKeys.Add(copy);
        return copy;
    }

    private async Task<string> CopyObjectAsync(
        string sourceKey,
        string? contentType,
        Guid workspaceId,
        string folder,
        int index,
        CancellationToken cancellationToken)
    {
        var extension = Path.GetExtension(sourceKey);
        var targetKey = $"sales-orders/{workspaceId:D}/{folder}/{index:D2}-{Guid.NewGuid():N}{extension}";
        await using var source = await objectStorage.GetAsync(sourceKey, cancellationToken);
        await objectStorage.PutAsync(targetKey, source, contentType ?? "application/octet-stream", cancellationToken);
        return targetKey;
    }
}

public sealed record SalesOrderListDto(Guid Id, string TrackingCode, string RequestTrackingCode, string? CustomerName,
    string? CustomerPhone, IReadOnlyList<string> ProductStatuses, int ItemsCount, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);

public sealed record SalesOrderDetailsDto(Guid Id, Guid SourceRequestId, Guid WorkspaceRequestId,
    string RequestTrackingCode, string TrackingCode, string Status, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);
