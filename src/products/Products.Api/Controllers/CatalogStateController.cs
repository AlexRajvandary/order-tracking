using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Products.Domain.Entities;
using Products.Infrastructure.Persistence;
using Products.Application.ExternalProducts;

namespace Products.Api.Controllers;

[ApiController]
[Route("api/catalog")]
public sealed class CatalogStateController : ControllerBase
{
    private const string VisitorHeader = "X-Catalog-Visitor";
    private readonly ProductsDbContext _db;
    private readonly IRakutenCatalogClient _rakuten;

    public CatalogStateController(ProductsDbContext db, IRakutenCatalogClient rakuten)
    {
        _db = db;
        _rakuten = rakuten;
    }

    [HttpGet("cart")]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<CartItemDto>>> Cart(CancellationToken cancellationToken)
    {
        var owner = ResolveOwner();
        if (owner is null) return BadRequest(new ProblemDetails { Detail = "A visitor key is required." });
        var rows = await _db.CatalogCartItems.AsNoTracking()
            .Include(x => x.Product).Where(x => Matches(x.UserId, x.VisitorKey, owner.Value))
            .OrderByDescending(x => x.UpdatedAt).ToListAsync(cancellationToken);
        var external = await _db.ExternalProductCartItems.AsNoTracking()
            .Where(x => Matches(x.UserId, x.VisitorKey, owner.Value))
            .OrderByDescending(x => x.UpdatedAt).ToListAsync(cancellationToken);
        return Ok(rows.Select(MapCart).Concat(external.Select(MapExternalCart)).OrderByDescending(x => x.UpdatedAt).ToList());
    }

    [HttpPut("cart/items/{productId:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<CartItemDto>> SetCart(Guid productId, SetCartItemRequest request, CancellationToken cancellationToken)
    {
        var owner = ResolveOwner();
        if (owner is null) return BadRequest(new ProblemDetails { Detail = "A visitor key is required." });
        var product = await _db.Products.AsNoTracking().SingleOrDefaultAsync(x => x.Id == productId && x.IsActive, cancellationToken);
        if (product is null) return NotFound();
        var row = await _db.CatalogCartItems.SingleOrDefaultAsync(x => x.ProductId == productId && Matches(x.UserId, x.VisitorKey, owner.Value), cancellationToken);
        if (request.Quantity <= 0)
        {
            if (row is not null) { _db.CatalogCartItems.Remove(row); await _db.SaveChangesAsync(cancellationToken); }
            return NoContent();
        }
        if (row is null)
        {
            row = new CatalogCartItem { Id = Guid.NewGuid(), ProductId = productId, UserId = owner.Value.UserId, VisitorKey = owner.Value.VisitorKey };
            _db.CatalogCartItems.Add(row);
        }
        row.Quantity = Math.Min(request.Quantity, 999);
        row.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return Ok(new CartItemDto("Internal", product.Id.ToString(), product.Id, null, product.Slug, product.Name,
            product.Price, product.CurrencyCode, product.LocalImageUrl ?? product.ImageUrl, product.SourceUrl, null,
            product.Shop?.Name, true, row.Quantity, row.UpdatedAt));
    }

    [HttpPut("cart/external/rakuten")]
    [AllowAnonymous]
    public async Task<ActionResult<CartItemDto>> SetRakutenCart(SetExternalCartItemRequest request, CancellationToken cancellationToken)
    {
        var owner = ResolveOwner();
        if (owner is null) return BadRequest(new ProblemDetails { Detail = "A visitor key is required." });
        if (string.IsNullOrWhiteSpace(request.ExternalId)) return BadRequest(new ProblemDetails { Detail = "externalId is required." });
        var row = await _db.ExternalProductCartItems.SingleOrDefaultAsync(x => x.Source == "Rakuten"
            && x.ExternalId == request.ExternalId && Matches(x.UserId, x.VisitorKey, owner.Value), cancellationToken);
        if (request.Quantity <= 0)
        {
            if (row is not null) { _db.ExternalProductCartItems.Remove(row); await _db.SaveChangesAsync(cancellationToken); }
            return NoContent();
        }
        ExternalCatalogProductDto item;
        try
        {
            item = await _rakuten.GetByItemCodeAsync(request.ExternalId, cancellationToken)
                ?? throw new KeyNotFoundException();
        }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (ExternalCatalogUnavailableException ex)
        {
            return StatusCode(503, new ProblemDetails { Detail = ex.Message });
        }
        if (!item.Available) return Conflict(new ProblemDetails { Detail = "Товар Rakuten недоступен." });
        var now = DateTimeOffset.UtcNow;
        row ??= new ExternalProductCartItem
        {
            Id = Guid.NewGuid(), Source = "Rakuten", ExternalId = request.ExternalId.Trim(),
            UserId = owner.Value.UserId, VisitorKey = owner.Value.VisitorKey, AddedAt = now,
        };
        if (_db.Entry(row).State == EntityState.Detached) _db.ExternalProductCartItems.Add(row);
        row.Name = item.Name; row.Description = item.Description; row.UnitPrice = item.Price;
        row.CurrencyCode = item.CurrencyCode; row.ImageUrl = item.ImageUrl; row.SourceUrl = item.SourceUrl;
        row.AffiliateUrl = item.AffiliateUrl; row.ShopCode = item.ShopCode; row.ShopName = item.ShopName;
        row.Available = item.Available; row.Quantity = Math.Min(request.Quantity, 100);
        row.LastValidatedAt = now; row.UpdatedAt = now;
        await _db.SaveChangesAsync(cancellationToken);
        return Ok(MapExternalCart(row));
    }

    [HttpDelete("cart")]
    [AllowAnonymous]
    public async Task<IActionResult> ClearCart(CancellationToken cancellationToken)
    {
        var owner = ResolveOwner();
        if (owner is null) return BadRequest(new ProblemDetails { Detail = "A visitor key is required." });
        await _db.CatalogCartItems.Where(x => Matches(x.UserId, x.VisitorKey, owner.Value)).ExecuteDeleteAsync(cancellationToken);
        await _db.ExternalProductCartItems.Where(x => Matches(x.UserId, x.VisitorKey, owner.Value)).ExecuteDeleteAsync(cancellationToken);
        return NoContent();
    }

    [HttpGet("favorites")]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<Guid>>> Favorites(CancellationToken cancellationToken)
    {
        var owner = ResolveOwner();
        if (owner is null) return BadRequest(new ProblemDetails { Detail = "A visitor key is required." });
        return Ok(await _db.CatalogFavorites.AsNoTracking().Where(x => Matches(x.UserId, x.VisitorKey, owner.Value)).Select(x => x.ProductId).ToListAsync(cancellationToken));
    }

    [HttpPut("favorites/{productId:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> SetFavorite(Guid productId, SetFavoriteRequest request, CancellationToken cancellationToken)
    {
        var owner = ResolveOwner();
        if (owner is null) return BadRequest(new ProblemDetails { Detail = "A visitor key is required." });
        if (request.Favorite && !await _db.Products.AnyAsync(x => x.Id == productId && x.IsActive, cancellationToken))
            return NotFound();
        var row = await _db.CatalogFavorites.SingleOrDefaultAsync(x => x.ProductId == productId && Matches(x.UserId, x.VisitorKey, owner.Value), cancellationToken);
        if (request.Favorite && row is null)
            _db.CatalogFavorites.Add(new CatalogFavorite { Id = Guid.NewGuid(), ProductId = productId, UserId = owner.Value.UserId, VisitorKey = owner.Value.VisitorKey, CreatedAt = DateTimeOffset.UtcNow });
        else if (!request.Favorite && row is not null) _db.CatalogFavorites.Remove(row);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpPost("merge")]
    [Authorize]
    public async Task<IActionResult> MergeVisitorState(CancellationToken cancellationToken)
    {
        var userId = User.FindFirst("sub")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var visitor = Request.Headers[VisitorHeader].FirstOrDefault()?.Trim();
        if (!Guid.TryParse(userId, out var accountId) || !IsValidVisitorKey(visitor))
            return BadRequest(new ProblemDetails { Detail = "An authenticated account and visitor key are required." });

        var guestCart = await _db.CatalogCartItems.Where(x => x.VisitorKey == visitor).ToListAsync(cancellationToken);
        var accountCart = await _db.CatalogCartItems.Where(x => x.UserId == accountId).ToDictionaryAsync(x => x.ProductId, cancellationToken);
        foreach (var item in guestCart)
        {
            if (accountCart.TryGetValue(item.ProductId, out var existing)) existing.Quantity = Math.Min(999, existing.Quantity + item.Quantity);
            else { item.UserId = accountId; item.VisitorKey = null; accountCart[item.ProductId] = item; }
        }
        var guestExternal = await _db.ExternalProductCartItems.Where(x => x.VisitorKey == visitor).ToListAsync(cancellationToken);
        var accountExternal = await _db.ExternalProductCartItems.Where(x => x.UserId == accountId)
            .ToDictionaryAsync(x => $"{x.Source}:{x.ExternalId}", cancellationToken);
        foreach (var item in guestExternal)
        {
            var key = $"{item.Source}:{item.ExternalId}";
            if (accountExternal.TryGetValue(key, out var existing))
            {
                existing.Quantity = Math.Min(100, existing.Quantity + item.Quantity);
                _db.ExternalProductCartItems.Remove(item);
            }
            else { item.UserId = accountId; item.VisitorKey = null; accountExternal[key] = item; }
        }
        var guestFavorites = await _db.CatalogFavorites.Where(x => x.VisitorKey == visitor).ToListAsync(cancellationToken);
        var accountFavoriteIds = await _db.CatalogFavorites.Where(x => x.UserId == accountId).Select(x => x.ProductId).ToHashSetAsync(cancellationToken);
        foreach (var favorite in guestFavorites)
        {
            if (accountFavoriteIds.Contains(favorite.ProductId)) _db.CatalogFavorites.Remove(favorite);
            else { favorite.UserId = accountId; favorite.VisitorKey = null; accountFavoriteIds.Add(favorite.ProductId); }
        }
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private Owner? ResolveOwner()
    {
        var userId = User.FindFirst("sub")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (User.Identity?.IsAuthenticated == true && Guid.TryParse(userId, out var id)) return new Owner(id, null);
        var key = Request.Headers[VisitorHeader].FirstOrDefault()?.Trim();
        return IsValidVisitorKey(key) ? new Owner(null, key) : null;
    }

    private static bool IsValidVisitorKey(string? value) => value is not null && value.Length <= 64 && Regex.IsMatch(value, "^[A-Za-z0-9_-]+$");
    private static bool Matches(Guid? userId, string? visitorKey, Owner owner) => owner.UserId is not null ? userId == owner.UserId : visitorKey == owner.VisitorKey;
    private static CartItemDto MapCart(CatalogCartItem item) => new("Internal", item.ProductId.ToString(), item.ProductId, null,
        item.Product.Slug, item.Product.NameRu ?? item.Product.Name, item.Product.Price, item.Product.CurrencyCode,
        item.Product.LocalImageUrl ?? item.Product.ImageUrl, item.Product.SourceUrl, null, item.Product.Shop?.Name,
        item.Product.IsActive, item.Quantity, item.UpdatedAt);
    private static CartItemDto MapExternalCart(ExternalProductCartItem item) => new(item.Source,
        "rakuten:" + Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(item.ExternalId)).TrimEnd('=').Replace('+', '-').Replace('/', '_'),
        null, item.ExternalId, item.ExternalId, item.Name, item.UnitPrice, item.CurrencyCode, item.ImageUrl,
        item.SourceUrl, item.AffiliateUrl, item.ShopName, item.Available, item.Quantity, item.UpdatedAt);
    private readonly record struct Owner(Guid? UserId, string? VisitorKey);
}

public sealed record SetCartItemRequest(int Quantity);
public sealed record SetExternalCartItemRequest(string ExternalId, int Quantity);
public sealed record SetFavoriteRequest(bool Favorite);
public sealed record CartItemDto(string Source, string Id, Guid? ProductId, string? ExternalId, string Slug, string Name,
    decimal Price, string CurrencyCode, string? ImageUrl, string? SourceUrl, string? AffiliateUrl, string? ShopName,
    bool Available, int Quantity, DateTimeOffset UpdatedAt);
