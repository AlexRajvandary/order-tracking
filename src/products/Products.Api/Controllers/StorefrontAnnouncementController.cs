using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Products.Domain.Entities;
using Products.Infrastructure.Persistence;

namespace Products.Api.Controllers;

[ApiController]
[Route("api/products/storefront-announcement")]
public sealed class StorefrontAnnouncementController : ControllerBase
{
    private const string DefaultText = "Оригинальные товары из Японии · Доставка по России · Новинки каждую неделю";
    private readonly ProductsDbContext _db;

    public StorefrontAnnouncementController(ProductsDbContext db) => _db = db;

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<StorefrontAnnouncementDto>> Get(CancellationToken cancellationToken)
    {
        var announcement = await _db.StorefrontAnnouncements
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == StorefrontAnnouncement.SingletonId, cancellationToken);

        return Ok(new StorefrontAnnouncementDto(
            announcement?.Text ?? DefaultText,
            announcement?.UpdatedAt ?? DateTimeOffset.UtcNow));
    }

    [HttpPut]
    [Authorize]
    public async Task<ActionResult<StorefrontAnnouncementDto>> Update(
        [FromBody] UpdateStorefrontAnnouncementRequest request,
        CancellationToken cancellationToken)
    {
        var text = request.Text?.Trim() ?? string.Empty;
        if (text.Length > 1000)
        {
            return BadRequest(new ProblemDetails { Detail = "Текст строки не должен превышать 1000 символов." });
        }

        var announcement = await _db.StorefrontAnnouncements
            .SingleOrDefaultAsync(x => x.Id == StorefrontAnnouncement.SingletonId, cancellationToken);
        if (announcement is null)
        {
            announcement = new StorefrontAnnouncement
            {
                Id = StorefrontAnnouncement.SingletonId,
                Text = text,
                UpdatedAt = DateTimeOffset.UtcNow,
            };
            _db.StorefrontAnnouncements.Add(announcement);
        }
        else
        {
            announcement.Text = text;
            announcement.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await _db.SaveChangesAsync(cancellationToken);
        return Ok(new StorefrontAnnouncementDto(announcement.Text, announcement.UpdatedAt));
    }
}

public sealed record UpdateStorefrontAnnouncementRequest(string? Text);
public sealed record StorefrontAnnouncementDto(string Text, DateTimeOffset UpdatedAt);
