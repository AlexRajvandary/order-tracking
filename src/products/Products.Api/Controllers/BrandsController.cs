using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Products.Application.Brands.ListBrands;
using Products.Application.Brands.Models;

namespace Products.Api.Controllers;

[ApiController]
[Route("api/products/brands")]
public sealed class BrandsController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public Task<BrandListResult> List([FromQuery] bool activeOnly = true, CancellationToken cancellationToken = default) =>
        mediator.Send(new ListBrandsQuery(activeOnly), cancellationToken);
}