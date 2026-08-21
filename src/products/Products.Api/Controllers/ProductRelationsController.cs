using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Products.Domain.Entities;
using Products.Infrastructure.Persistence;

namespace Products.Api.Controllers;

[ApiController]
[Route("api/products/{productId:guid}")]
public sealed class ProductRelationsController : ControllerBase
{
    private readonly ProductsDbContext _db;

    public ProductRelationsController(ProductsDbContext db) => _db = db;

    [HttpGet("variants")]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<ProductVariantDto>>> ListVariants(
        Guid productId, CancellationToken cancellationToken)
    {
        if (!await ProductExists(productId, cancellationToken)) return NotFound();
        var items = await _db.ProductVariants.AsNoTracking()
            .Where(x => x.ProductId == productId)
            .OrderBy(x => x.Size).ThenBy(x => x.CreatedAt)
            .Select(x => ToDto(x))
            .ToListAsync(cancellationToken);
        return items;
    }

    [HttpPost("variants")]
    [Authorize]
    public async Task<ActionResult<ProductVariantDto>> CreateVariant(
        Guid productId, CreateProductVariantRequest request, CancellationToken cancellationToken)
    {
        if (!await ProductExists(productId, cancellationToken)) return NotFound();
        var now = DateTimeOffset.UtcNow;
        var entity = new ProductVariant
        {
            Id = Guid.NewGuid(), ProductId = productId, Size = request.Size,
            Price = request.Price, CurrencyCode = request.CurrencyCode?.Trim().ToUpperInvariant(),
            IsAvailable = request.IsAvailable, CreatedAt = now,
        };
        _db.ProductVariants.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetVariant), new { productId, id = entity.Id }, ToDto(entity));
    }

    [HttpGet("variants/{id:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<ProductVariantDto>> GetVariant(
        Guid productId, Guid id, CancellationToken cancellationToken)
    {
        var entity = await _db.ProductVariants.AsNoTracking()
            .FirstOrDefaultAsync(x => x.ProductId == productId && x.Id == id, cancellationToken);
        return entity is null ? NotFound() : ToDto(entity);
    }

    [HttpPut("variants/{id:guid}")]
    [Authorize]
    public async Task<ActionResult<ProductVariantDto>> UpdateVariant(
        Guid productId, Guid id, UpdateProductVariantRequest request, CancellationToken cancellationToken)
    {
        var entity = await _db.ProductVariants
            .FirstOrDefaultAsync(x => x.ProductId == productId && x.Id == id, cancellationToken);
        if (entity is null) return NotFound();
        entity.Size = request.Size;
        entity.Price = request.Price;
        entity.CurrencyCode = request.CurrencyCode?.Trim().ToUpperInvariant();
        entity.IsAvailable = request.IsAvailable;
        entity.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return ToDto(entity);
    }

    [HttpDelete("variants/{id:guid}")]
    [Authorize]
    public async Task<IActionResult> DeleteVariant(
        Guid productId, Guid id, CancellationToken cancellationToken)
    {
        var entity = await _db.ProductVariants
            .FirstOrDefaultAsync(x => x.ProductId == productId && x.Id == id, cancellationToken);
        if (entity is null) return NotFound();
        _db.ProductVariants.Remove(entity);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpGet("images")]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<ProductImageDto>>> ListImages(
        Guid productId, CancellationToken cancellationToken)
    {
        if (!await ProductExists(productId, cancellationToken)) return NotFound();
        var items = await _db.ProductImages.AsNoTracking()
            .Where(x => x.ProductId == productId)
            .OrderBy(x => x.SortOrder).ThenBy(x => x.CreatedAt)
            .Select(x => ToDto(x))
            .ToListAsync(cancellationToken);
        return items;
    }

    [HttpPost("images")]
    [Authorize]
    public async Task<ActionResult<ProductImageDto>> CreateImage(
        Guid productId, CreateProductImageRequest request, CancellationToken cancellationToken)
    {
        if (!await ProductExists(productId, cancellationToken)) return NotFound();
        var entity = new ProductImage
        {
            Id = Guid.NewGuid(), ProductId = productId, ImageUrl = request.ImageUrl.Trim(),
            SortOrder = request.SortOrder, IsPrimary = request.IsPrimary, CreatedAt = DateTimeOffset.UtcNow,
        };
        _db.ProductImages.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetImage), new { productId, id = entity.Id }, ToDto(entity));
    }

    [HttpGet("images/{id:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<ProductImageDto>> GetImage(
        Guid productId, Guid id, CancellationToken cancellationToken)
    {
        var entity = await _db.ProductImages.AsNoTracking()
            .FirstOrDefaultAsync(x => x.ProductId == productId && x.Id == id, cancellationToken);
        return entity is null ? NotFound() : ToDto(entity);
    }

    [HttpPut("images/{id:guid}")]
    [Authorize]
    public async Task<ActionResult<ProductImageDto>> UpdateImage(
        Guid productId, Guid id, UpdateProductImageRequest request, CancellationToken cancellationToken)
    {
        var entity = await _db.ProductImages
            .FirstOrDefaultAsync(x => x.ProductId == productId && x.Id == id, cancellationToken);
        if (entity is null) return NotFound();
        entity.ImageUrl = request.ImageUrl.Trim();
        entity.SortOrder = request.SortOrder;
        entity.IsPrimary = request.IsPrimary;
        await _db.SaveChangesAsync(cancellationToken);
        return ToDto(entity);
    }

    [HttpDelete("images/{id:guid}")]
    [Authorize]
    public async Task<IActionResult> DeleteImage(
        Guid productId, Guid id, CancellationToken cancellationToken)
    {
        var entity = await _db.ProductImages
            .FirstOrDefaultAsync(x => x.ProductId == productId && x.Id == id, cancellationToken);
        if (entity is null) return NotFound();
        _db.ProductImages.Remove(entity);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private Task<bool> ProductExists(Guid id, CancellationToken cancellationToken) =>
        _db.Products.AnyAsync(x => x.Id == id, cancellationToken);

    private static ProductVariantDto ToDto(ProductVariant x) =>
        new(x.Id, x.ProductId, x.Size, x.Price, x.CurrencyCode, x.IsAvailable, x.CreatedAt, x.UpdatedAt);

    private static ProductImageDto ToDto(ProductImage x) =>
        new(x.Id, x.ProductId, x.ImageUrl, x.SortOrder, x.IsPrimary, x.CreatedAt);
}

public sealed record CreateProductVariantRequest(
    [property: StringLength(100)] string? Size,
    decimal? Price,
    [property: StringLength(3, MinimumLength = 3)] string? CurrencyCode,
    bool? IsAvailable);

public sealed record UpdateProductVariantRequest(
    [property: StringLength(100)] string? Size,
    decimal? Price,
    [property: StringLength(3, MinimumLength = 3)] string? CurrencyCode,
    bool? IsAvailable);

public sealed record ProductVariantDto(
    Guid Id, Guid ProductId, string? Size, decimal? Price, string? CurrencyCode,
    bool? IsAvailable, DateTimeOffset CreatedAt, DateTimeOffset? UpdatedAt);

public sealed record CreateProductImageRequest(
    [property: Required, StringLength(2000)] string ImageUrl,
    int SortOrder = 0,
    bool IsPrimary = false);

public sealed record UpdateProductImageRequest(
    [property: Required, StringLength(2000)] string ImageUrl,
    int SortOrder = 0,
    bool IsPrimary = false);

public sealed record ProductImageDto(
    Guid Id, Guid ProductId, string ImageUrl, int SortOrder, bool IsPrimary, DateTimeOffset CreatedAt);
