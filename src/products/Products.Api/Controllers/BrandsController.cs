using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Products.Application.Brands.ListBrands;

namespace Products.Api.Controllers;

[ApiController]
[Route("api/products/brands")]
public sealed class BrandsController : ControllerBase
{
    private readonly IMediator _mediator;

    public BrandsController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    [AllowAnonymous]
    public Task<Products.Application.Brands.Models.BrandListResult> List(
        [FromQuery] bool activeOnly = true,
        CancellationToken cancellationToken = default) =>
        _mediator.Send(new ListBrandsQuery(activeOnly), cancellationToken);
}
