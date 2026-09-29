using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Domain.Entities;
using OrderTracking.Domain.Enums;
using OrderTracking.Infrastructure.Persistence;

namespace OrderTracking.Api.Controllers;

[ApiController]
[Route("api/v1/procurements")]
[Authorize(Roles = "Buyer,Moderator,Admin,SuperAdmin")]
public sealed class ProcurementAttachmentsController(
    ApplicationDbContext db,
    IObjectStorage objectStorage) : ControllerBase
{
    private const long MaxFileBytes = 20 * 1024 * 1024;
    private const int MaxWarehousePhotos = 10;
    private static readonly HashSet<string> AllowedImageContentTypes = new(
        ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"],
        StringComparer.OrdinalIgnoreCase);

    [HttpGet("attachments/{attachmentId:guid}")]
    public async Task<IActionResult> GetAttachment(
        Guid attachmentId,
        CancellationToken cancellationToken)
    {
        var attachment = await db.OrderItemProcurementAttachments
            .AsNoTracking()
            .Where(value => value.Id == attachmentId && !value.Procurement.IsDeleted)
            .Select(value => new
            {
                value.ObjectKey,
                value.ContentType,
                value.OriginalFileName,
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (attachment is null)
        {
            return NotFound();
        }

        var content = await objectStorage.GetAsync(attachment.ObjectKey, cancellationToken);
        Response.Headers.ContentDisposition =
            $"inline; filename=\"{Uri.EscapeDataString(attachment.OriginalFileName ?? "attachment")}\"";
        return File(content, attachment.ContentType, enableRangeProcessing: true);
    }

    [HttpPost("{id:guid}/receipt")]
    [RequestSizeLimit(MaxFileBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxFileBytes)]
    public async Task<ActionResult<ProcurementAttachmentDto>> UploadReceipt(
        Guid id,
        IFormFile file,
        CancellationToken cancellationToken)
    {
        var procurement = await db.OrderItemProcurements
            .Include(value => value.Attachments)
            .FirstOrDefaultAsync(value => value.Id == id, cancellationToken);

        if (procurement is null)
        {
            return NotFound();
        }

        var validation = ValidateFile(file, imagesOnly: false);
        if (validation is not null)
        {
            return BadRequest(new { detail = validation });
        }

        var oldReceipt = procurement.Attachments
            .FirstOrDefault(value => value.Kind == ProcurementAttachmentKind.Receipt);
        var attachment = await StoreAsync(
            procurement.Id,
            ProcurementAttachmentKind.Receipt,
            file,
            cancellationToken);

        try
        {
            if (oldReceipt is not null)
            {
                db.OrderItemProcurementAttachments.Remove(oldReceipt);
            }

            db.OrderItemProcurementAttachments.Add(attachment);
            await db.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            await objectStorage.DeleteAsync(attachment.ObjectKey, CancellationToken.None);
            throw;
        }

        if (oldReceipt is not null)
        {
            await objectStorage.DeleteAsync(oldReceipt.ObjectKey, cancellationToken);
        }

        return Ok(ToDto(attachment));
    }

    [HttpPost("{id:guid}/warehouse-photos")]
    [RequestSizeLimit(MaxFileBytes * MaxWarehousePhotos)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxFileBytes * MaxWarehousePhotos)]
    public async Task<ActionResult<IReadOnlyList<ProcurementAttachmentDto>>> UploadWarehousePhotos(
        Guid id,
        CancellationToken cancellationToken)
    {
        var procurement = await db.OrderItemProcurements
            .Include(value => value.Attachments)
            .FirstOrDefaultAsync(value => value.Id == id, cancellationToken);

        if (procurement is null)
        {
            return NotFound();
        }

        var form = await Request.ReadFormAsync(cancellationToken);
        var files = form.Files.Where(value => value.Length > 0).ToList();
        var existingCount = procurement.Attachments.Count(
            value => value.Kind == ProcurementAttachmentKind.WarehousePhoto);

        if (files.Count == 0)
        {
            return BadRequest(new { detail = "Выберите хотя бы одну фотографию." });
        }

        if (existingCount + files.Count > MaxWarehousePhotos)
        {
            return BadRequest(new { detail = $"Можно загрузить не более {MaxWarehousePhotos} фотографий." });
        }

        foreach (var file in files)
        {
            var validation = ValidateFile(file, imagesOnly: true);
            if (validation is not null)
            {
                return BadRequest(new { detail = validation });
            }
        }

        var attachments = new List<OrderItemProcurementAttachment>();
        try
        {
            foreach (var file in files)
            {
                attachments.Add(await StoreAsync(
                    procurement.Id,
                    ProcurementAttachmentKind.WarehousePhoto,
                    file,
                    cancellationToken));
            }

            db.OrderItemProcurementAttachments.AddRange(attachments);
            await db.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            foreach (var attachment in attachments)
            {
                await objectStorage.DeleteAsync(attachment.ObjectKey, CancellationToken.None);
            }

            throw;
        }

        return Ok(attachments.Select(ToDto).ToList());
    }

    [HttpDelete("{id:guid}/attachments/{attachmentId:guid}")]
    public async Task<IActionResult> DeleteAttachment(
        Guid id,
        Guid attachmentId,
        CancellationToken cancellationToken)
    {
        var attachment = await db.OrderItemProcurementAttachments
            .FirstOrDefaultAsync(
                value => value.Id == attachmentId && value.ProcurementId == id,
                cancellationToken);

        if (attachment is null)
        {
            return NotFound();
        }

        db.OrderItemProcurementAttachments.Remove(attachment);
        await db.SaveChangesAsync(cancellationToken);
        await objectStorage.DeleteAsync(attachment.ObjectKey, cancellationToken);
        return NoContent();
    }

    private async Task<OrderItemProcurementAttachment> StoreAsync(
        Guid procurementId,
        ProcurementAttachmentKind kind,
        IFormFile file,
        CancellationToken cancellationToken)
    {
        var extension = Path.GetExtension(file.FileName);
        if (extension.Length > 10)
        {
            extension = string.Empty;
        }

        var attachment = new OrderItemProcurementAttachment
        {
            Id = Guid.NewGuid(),
            ProcurementId = procurementId,
            Kind = kind,
            ObjectKey = $"procurements/{procurementId}/{kind}/{Guid.NewGuid():N}{extension.ToLowerInvariant()}",
            ContentType = string.IsNullOrWhiteSpace(file.ContentType)
                ? "application/octet-stream"
                : file.ContentType,
            OriginalFileName = Path.GetFileName(file.FileName),
            SizeBytes = file.Length,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        await using var content = file.OpenReadStream();
        await objectStorage.PutAsync(
            attachment.ObjectKey,
            content,
            attachment.ContentType,
            cancellationToken);

        return attachment;
    }

    private static string? ValidateFile(IFormFile file, bool imagesOnly)
    {
        if (file.Length <= 0)
        {
            return "Файл пуст.";
        }

        if (file.Length > MaxFileBytes)
        {
            return "Размер одного файла не должен превышать 20 МБ.";
        }

        if (!AllowedImageContentTypes.Contains(file.ContentType)
            && (imagesOnly || !file.ContentType.Equals("application/pdf", StringComparison.OrdinalIgnoreCase)))
        {
            return imagesOnly
                ? "Поддерживаются изображения JPEG, PNG, WebP, GIF и HEIC."
                : "Для чека поддерживаются изображения и PDF.";
        }

        return null;
    }

    private static ProcurementAttachmentDto ToDto(OrderItemProcurementAttachment value) =>
        new(
            value.Id,
            value.Kind,
            value.OriginalFileName,
            value.ContentType,
            value.SizeBytes,
            $"/api/v1/procurements/attachments/{value.Id}");
}
