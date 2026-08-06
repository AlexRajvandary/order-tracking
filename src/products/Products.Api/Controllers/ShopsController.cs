using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Products.Application.Shops.ListShops;

namespace Products.Api.Controllers;

[ApiController]
[Route("api/products/shops")]
public sealed class ShopsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ShopsController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    [AllowAnonymous]
    public Task<Products.Application.Shops.Models.ShopListResult> List(
        [FromQuery] bool activeOnly = true,
        CancellationToken cancellationToken = default) =>
        _mediator.Send(new ListShopsQuery(activeOnly), cancellationToken);
}
