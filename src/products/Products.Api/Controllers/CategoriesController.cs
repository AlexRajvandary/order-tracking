using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Products.Application.Categories.ListCategories;
using Products.Application.Categories.ManageCategories;

namespace Products.Api.Controllers;

[ApiController]
[Route("api/products/categories")]
public sealed class CategoriesController : ControllerBase
{
    private readonly IMediator _mediator;

    public CategoriesController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    [AllowAnonymous]
    public Task<Products.Application.Categories.Models.CategoryListResult> List(
        [FromQuery] bool rootsOnly = false,
        [FromQuery] bool popularOnly = false,
        [FromQuery] bool activeOnly = true,
        [FromQuery] bool includeProductCounts = false,
        [FromQuery] bool? productsActiveOnly = null,
        CancellationToken cancellationToken = default) =>
        _mediator.Send(
            new ListCategoriesQuery(
                rootsOnly,
                popularOnly,
                activeOnly,
                includeProductCounts,
                productsActiveOnly),
            cancellationToken);

    [HttpPost]
    [Authorize]
    public Task<Products.Application.Categories.Models.CategoryDto> Create(
        [FromBody] CreateCategoryRequest body,
        CancellationToken cancellationToken) =>
        _mediator.Send(new CreateCategoryCommand(body.Name, body.ParentId), cancellationToken);

    [HttpPut("{id:guid}")]
    [Authorize]
    public Task<Products.Application.Categories.Models.CategoryDto> Rename(
        Guid id,
        [FromBody] RenameCategoryRequest body,
        CancellationToken cancellationToken) =>
        _mediator.Send(new RenameCategoryCommand(id, body.Name), cancellationToken);

    [HttpDelete("{id:guid}")]
    [Authorize]
    public async Task<ActionResult<DeleteCategoryResult>> Delete(
        Guid id,
        CancellationToken cancellationToken) =>
        Ok(await _mediator.Send(new DeleteCategoryCommand(id), cancellationToken));
}

public sealed record CreateCategoryRequest(string Name, Guid? ParentId = null);
public sealed record RenameCategoryRequest(string Name);
