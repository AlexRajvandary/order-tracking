using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Products.Application.Products.CreateProduct;
using Products.Application.Products.DeleteProduct;
using Products.Application.Products.GetProduct;
using Products.Application.Products.GetProductAudit;
using Products.Application.Products.ImportProducts;
using Products.Application.Products.ListProducts;
using Products.Application.Products.PatchProduct;
using Products.Application.Products.SetProductsVisibility;
using Products.Application.Products.UpdateProduct;

namespace Products.Api.Controllers;

[ApiController]
[Route("api/products")]
public sealed class ProductsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ProductsController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    [AllowAnonymous]
    public Task<Products.Application.Products.Models.ProductListResult> List(
        [FromQuery] string? search,
        [FromQuery] bool? activeOnly,
        [FromQuery] Guid? brandId,
        [FromQuery] string? brand,
        [FromQuery] Guid? shopId,
        [FromQuery] string? shop,
        [FromQuery] string? condition,
        [FromQuery] Guid? categoryId,
        [FromQuery] string? category,
        [FromQuery] bool includeCategoryChildren = false,
        [FromQuery] decimal? priceMin = null,
        [FromQuery] decimal? priceMax = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default) =>
        _mediator.Send(
            new ListProductsQuery(
                search,
                activeOnly,
                brandId,
                brand,
                shopId,
                shop,
                condition,
                categoryId,
                category,
                includeCategoryChildren,
                priceMin,
                priceMax,
                page,
                pageSize),
            cancellationToken);

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public Task<Products.Application.Products.Models.ProductDto> GetById(
        Guid id,
        CancellationToken cancellationToken) =>
        _mediator.Send(new GetProductByIdQuery(id), cancellationToken);

    [HttpGet("by-slug/{*slug}")]
    [AllowAnonymous]
    public Task<Products.Application.Products.Models.ProductDto> GetBySlug(
        string slug,
        CancellationToken cancellationToken) =>
        _mediator.Send(new GetProductBySlugQuery(slug), cancellationToken);

    [HttpGet("{id:guid}/audit")]
    [Authorize]
    public Task<Products.Application.Products.Models.ProductAuditListResult> GetAudit(
        Guid id,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default) =>
        _mediator.Send(new GetProductAuditQuery(id, page, pageSize), cancellationToken);

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<Products.Application.Products.Models.ProductDto>> Create(
        [FromBody] CreateProductCommand command,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPost("import")]
    [Authorize]
    public Task<ImportProductsResult> Import(
        [FromBody] ImportProductsCommand command,
        CancellationToken cancellationToken) =>
        _mediator.Send(command, cancellationToken);

    [HttpPut("{id:guid}")]
    [Authorize]
    public Task<Products.Application.Products.Models.ProductDto> Update(
        Guid id,
        [FromBody] UpdateProductRequest body,
        CancellationToken cancellationToken) =>
        _mediator.Send(
            new UpdateProductCommand(
                id,
                body.Name,
                body.Slug,
                body.Description,
                body.Sku,
                body.Brand,
                body.BrandId,
                body.Price,
                body.CurrencyCode,
                body.OriginalPrice,
                body.OriginalCurrencyCode,
                body.ImageUrl,
                body.SourceUrl,
                body.IsActive,
                body.Condition,
                body.ShopId,
                body.CategoryId),
            cancellationToken);

    [HttpPatch("{id:guid}")]
    [Authorize]
    public Task<Products.Application.Products.Models.ProductDto> Patch(
        Guid id,
        [FromBody] PatchProductRequest body,
        CancellationToken cancellationToken) =>
        _mediator.Send(
            new PatchProductCommand(
                id,
                body.Name,
                body.Price,
                body.OriginalPrice,
                body.ClearOriginalPrice,
                body.IsActive,
                body.CategoryId,
                body.ClearCategory,
                body.ShopId,
                body.ClearShop),
            cancellationToken);

    [HttpPost("bulk-visibility")]
    [Authorize]
    public Task<SetProductsVisibilityResult> SetVisibility(
        [FromBody] SetProductsVisibilityRequest body,
        CancellationToken cancellationToken) =>
        _mediator.Send(
            new SetProductsVisibilityCommand(
                body.IsActive,
                body.ProductIds,
                body.Search,
                body.ActiveOnly,
                body.Brand,
                body.Shop,
                body.Condition,
                body.CategoryId,
                body.Category,
                body.IncludeCategoryChildren,
                body.PriceMin,
                body.PriceMax,
                body.MatchFilters),
            cancellationToken);

    [HttpDelete("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await _mediator.Send(new DeleteProductCommand(id), cancellationToken);
        return NoContent();
    }
}

public sealed record UpdateProductRequest(
    string Name,
    string? Slug,
    string? Description,
    string? Sku,
    string? Brand,
    Guid? BrandId,
    decimal Price,
    string? CurrencyCode,
    decimal? OriginalPrice,
    string? OriginalCurrencyCode,
    string ImageUrl,
    string? SourceUrl,
    bool IsActive,
    string? Condition = null,
    Guid? ShopId = null,
    Guid? CategoryId = null);

public sealed record PatchProductRequest(
    string? Name = null,
    decimal? Price = null,
    decimal? OriginalPrice = null,
    bool? ClearOriginalPrice = null,
    bool? IsActive = null,
    Guid? CategoryId = null,
    bool? ClearCategory = null,
    Guid? ShopId = null,
    bool? ClearShop = null);

public sealed record SetProductsVisibilityRequest(
    bool IsActive,
    IReadOnlyList<Guid>? ProductIds = null,
    string? Search = null,
    bool? ActiveOnly = null,
    string? Brand = null,
    string? Shop = null,
    string? Condition = null,
    Guid? CategoryId = null,
    string? Category = null,
    bool IncludeCategoryChildren = true,
    decimal? PriceMin = null,
    decimal? PriceMax = null,
    bool MatchFilters = false);
