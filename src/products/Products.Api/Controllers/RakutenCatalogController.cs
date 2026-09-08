using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Products.Application.ExternalProducts;
using Products.Infrastructure.Persistence;

namespace Products.Api.Controllers;

[ApiController]
[Route("api/products/external/rakuten")]
public sealed class RakutenCatalogController : ControllerBase
{
    private readonly IRakutenCatalogClient _rakuten;
    private readonly ProductsDbContext _db;
    private readonly IConfiguration _configuration;

    public RakutenCatalogController(IRakutenCatalogClient rakuten, ProductsDbContext db, IConfiguration configuration)
    {
        _rakuten = rakuten; _db = db; _configuration = configuration;
    }

    [HttpGet("search")]
    [AllowAnonymous]
    public async Task<ActionResult<ExternalCatalogSearchResult>> Search(
        [FromQuery] string? keyword, [FromQuery] long? genreId, [FromQuery] decimal? minPrice,
        [FromQuery] decimal? maxPrice, [FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        [FromQuery] string? sort = null, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(keyword) && genreId is null)
            return BadRequest(new ProblemDetails { Detail = "keyword or genreId is required." });
        if (keyword?.Length > 128 || page is < 1 or > 100 || pageSize is < 1 or > 30)
            return BadRequest(new ProblemDetails { Detail = "Invalid Rakuten search parameters." });
        try
        {
            return Ok(await _rakuten.SearchAsync(new(keyword, genreId, minPrice, maxPrice, page, pageSize, sort), cancellationToken));
        }
        catch (ExternalCatalogUnavailableException ex)
        {
            return StatusCode(503, new ProblemDetails { Title = "Rakuten временно недоступен", Detail = ex.Message });
        }
    }

    [HttpGet("item")]
    [AllowAnonymous]
    public async Task<ActionResult<ExternalCatalogProductDto>> GetItem([FromQuery] string itemCode, CancellationToken cancellationToken)
    {
        try
        {
            var item = await _rakuten.GetByItemCodeAsync(itemCode, cancellationToken);
            return item is null ? NotFound() : Ok(item);
        }
        catch (ExternalCatalogUnavailableException ex)
        {
            return StatusCode(503, new ProblemDetails { Title = "Rakuten временно недоступен", Detail = ex.Message });
        }
    }

    [HttpPost("resolve-checkout")]
    public async Task<ActionResult<ResolveCheckoutResponse>> ResolveCheckout(
        [FromBody] ResolveCheckoutRequest request, CancellationToken cancellationToken)
    {
        if (!IsInternalRequest()) return Unauthorized();
        var snapshots = new List<CheckoutProductSnapshot>();
        var issues = new List<CheckoutProductIssue>();
        foreach (var reference in request.Items.Take(100))
        {
            if (reference.Source == ProductSource.Internal && reference.ProductId is Guid productId)
            {
                var product = await _db.Products.AsNoTracking().Include(x => x.Shop)
                    .FirstOrDefaultAsync(x => x.Id == productId, cancellationToken);
                if (product is null || !product.IsActive)
                {
                    issues.Add(new(reference.Source, productId.ToString(), "unavailable", reference.ExpectedUnitPrice, null, null));
                    continue;
                }
                if (reference.ExpectedUnitPrice is not null && reference.ExpectedUnitPrice != product.Price)
                {
                    issues.Add(new(reference.Source, productId.ToString(), "price_changed", reference.ExpectedUnitPrice, product.Price, product.CurrencyCode));
                    continue;
                }
                snapshots.Add(new(reference.Source, product.Id, null, product.NameRu ?? product.Name, product.Description,
                    product.Price, product.CurrencyCode, product.LocalImageUrl ?? product.ImageUrl, product.SourceUrl,
                    null, product.Shop?.Slug, product.Shop?.Name, true));
                continue;
            }
            if (reference.Source == ProductSource.Rakuten && !string.IsNullOrWhiteSpace(reference.ExternalId))
            {
                ExternalCatalogProductDto? item;
                try { item = await _rakuten.GetByItemCodeAsync(reference.ExternalId, cancellationToken); }
                catch (ExternalCatalogUnavailableException ex)
                {
                    return StatusCode(503, new ProblemDetails { Title = "Rakuten временно недоступен", Detail = ex.Message });
                }
                if (item is null || !item.Available)
                {
                    issues.Add(new(reference.Source, reference.ExternalId, "unavailable", reference.ExpectedUnitPrice, item?.Price, item?.CurrencyCode));
                    continue;
                }
                if (reference.ExpectedUnitPrice is not null && reference.ExpectedUnitPrice != item.Price)
                {
                    issues.Add(new(reference.Source, reference.ExternalId, "price_changed", reference.ExpectedUnitPrice, item.Price, item.CurrencyCode));
                    continue;
                }
                snapshots.Add(new(reference.Source, null, item.ExternalId, item.Name, item.Description, item.Price,
                    item.CurrencyCode, item.ImageUrl, item.SourceUrl, item.AffiliateUrl, item.ShopCode, item.ShopName, true));
                continue;
            }
            issues.Add(new(reference.Source, reference.ExternalId ?? reference.ProductId?.ToString() ?? "", "invalid_reference", reference.ExpectedUnitPrice, null, null));
        }
        return Ok(new ResolveCheckoutResponse(snapshots, issues));
    }

    private bool IsInternalRequest()
    {
        var expected = _configuration["ProductsApi:InternalApiKey"];
        var actual = Request.Headers["X-Products-Api-Key"].FirstOrDefault();
        if (string.IsNullOrEmpty(expected) || string.IsNullOrEmpty(actual)) return false;
        var expectedBytes = Encoding.UTF8.GetBytes(expected);
        var actualBytes = Encoding.UTF8.GetBytes(actual);
        return expectedBytes.Length == actualBytes.Length
            && CryptographicOperations.FixedTimeEquals(expectedBytes, actualBytes);
    }
}

public sealed record ResolveCheckoutRequest(IReadOnlyList<CheckoutProductReference> Items);
public sealed record CheckoutProductReference(ProductSource Source, Guid? ProductId, string? ExternalId, decimal? ExpectedUnitPrice, string? ExpectedCurrencyCode);
public sealed record CheckoutProductSnapshot(ProductSource Source, Guid? ProductId, string? ExternalId, string Name, string? Description,
    decimal Price, string CurrencyCode, string? ImageUrl, string? SourceUrl, string? AffiliateUrl, string? ShopCode, string? ShopName, bool Available);
public sealed record CheckoutProductIssue(ProductSource Source, string Id, string Reason, decimal? PreviousPrice, decimal? CurrentPrice, string? CurrencyCode);
public sealed record ResolveCheckoutResponse(IReadOnlyList<CheckoutProductSnapshot> Items, IReadOnlyList<CheckoutProductIssue> Issues);
