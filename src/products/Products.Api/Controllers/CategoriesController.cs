using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Products.Application.Categories.ListCategories;

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
}
