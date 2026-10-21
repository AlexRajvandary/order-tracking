using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Products.Application.Cart.ClearCart;
using Products.Application.Cart;
using Products.Application.Cart.GetCart;
using Products.Application.Cart.MergeVisitorState;
using Products.Application.Cart.SetCart;
using Products.Application.Cart.SetRakutenCartItem;
using Products.Application.Favorites.ClearFavorites;
using Products.Application.Favorites.GetFavorites;
using Products.Application.Favorites.SetFavorite;

namespace Products.Api.Controllers;

[ApiController]
[Route("api/catalog")]
public sealed class CatalogStateController(
    IMediator mediator) : ControllerBase
{
    private const string VisitorKeyIsRequiredMessage = "A visitor key is required.";

    [HttpGet("cart")]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<CartItemDto>>> GetCartItems(CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetCartQuery(), cancellationToken);
        return result switch
        {
            GetCartResult.Success success => Ok(success.Items),
            GetCartResult.OwnerRequired => BadRequest(OwnerRequiredProblem()),
            _ => throw new InvalidOperationException("Unknown cart query result."),
        };
    }

    [HttpPut("cart/items/{productId:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<CartItemDto>> SetCart(
        Guid productId,
        [FromBody] SetCartItemRequest request,
        CancellationToken cancellationToken)
    {
        var result = await mediator.Send(
            new SetCartItemCommand(productId, request.Quantity, request.SelectedColor, request.SelectedSize),
            cancellationToken);

        return result switch
        {
            SetCartItemResult.Updated updated => Ok(updated.Item),
            SetCartItemResult.Deleted => NoContent(),
            SetCartItemResult.ProductNotFound => NotFound(),
            SetCartItemResult.InvalidOption invalid => BadRequest(new ProblemDetails { Detail = invalid.Message }),
            SetCartItemResult.OwnerRequired => BadRequest(OwnerRequiredProblem()),
            _ => throw new InvalidOperationException("Unknown cart update result."),
        };
    }

    [HttpPut("cart/external/rakuten")]
    [AllowAnonymous]
    public async Task<ActionResult<CartItemDto>> SetRakutenCart(
        [FromBody] SetExternalCartItemRequest request,
        CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new SetRakutenCartItemCommand(request.ExternalId, request.Quantity), cancellationToken);
        return result switch
        {
            SetRakutenCartItemResult.Updated updated => Ok(updated.Item),
            SetRakutenCartItemResult.Deleted => NoContent(),
            SetRakutenCartItemResult.NotFound => NotFound(),
            SetRakutenCartItemResult.InvalidRequest invalid => BadRequest(new ProblemDetails { Detail = invalid.Message }),
            SetRakutenCartItemResult.OwnerRequired => BadRequest(OwnerRequiredProblem()),
            SetRakutenCartItemResult.Unavailable unavailable => StatusCode(503, new ProblemDetails { Detail = unavailable.Message }),
            SetRakutenCartItemResult.ProductUnavailable => Conflict(new ProblemDetails { Detail = "Товар Rakuten недоступен." }),
            _ => throw new InvalidOperationException("Unknown Rakuten cart update result."),
        };
    }

    [HttpDelete("cart")]
    [AllowAnonymous]
    public async Task<IActionResult> ClearCart(CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new ClearCartCommand(), cancellationToken);
        return result switch
        {
            ClearCartResult.Cleared => NoContent(),
            ClearCartResult.OwnerRequired => BadRequest(OwnerRequiredProblem()),
            _ => throw new InvalidOperationException("Unknown clear cart result."),
        };
    }

    [HttpGet("favorites")]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<Guid>>> Favorites(CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetFavoritesQuery(), cancellationToken);
        return result switch
        {
            GetFavoritesResult.Success success => Ok(success.ProductIds),
            GetFavoritesResult.OwnerRequired => BadRequest(OwnerRequiredProblem()),
            _ => throw new InvalidOperationException("Unknown favorites query result."),
        };
    }

    [HttpDelete("favorites")]
    [AllowAnonymous]
    public async Task<IActionResult> ClearFavorites(CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new ClearFavoritesCommand(), cancellationToken);
        return result switch
        {
            ClearFavoritesResult.Cleared => NoContent(),
            ClearFavoritesResult.OwnerRequired => BadRequest(OwnerRequiredProblem()),
            _ => throw new InvalidOperationException("Unknown clear favorites result."),
        };
    }

    [HttpPut("favorites/{productId:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> SetFavorite(
        Guid productId,
        [FromBody] SetFavoriteRequest request,
        CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new SetFavoriteCommand(productId, request.Favorite), cancellationToken);
        return result switch
        {
            SetFavoriteResult.Updated => NoContent(),
            SetFavoriteResult.ProductNotFound => NotFound(),
            SetFavoriteResult.OwnerRequired => BadRequest(OwnerRequiredProblem()),
            _ => throw new InvalidOperationException("Unknown favorite update result."),
        };
    }

    [HttpPost("merge")]
    [Authorize]
    public async Task<IActionResult> MergeVisitorState(CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new MergeVisitorStateCommand(), cancellationToken);
        return result switch
        {
            MergeVisitorStateResult.Merged => NoContent(),
            MergeVisitorStateResult.InvalidOwner => BadRequest(new ProblemDetails { Detail = "An authenticated account and visitor key are required." }),
            _ => throw new InvalidOperationException("Unknown visitor state merge result."),
        };
    }

    private static ProblemDetails OwnerRequiredProblem() => new() { Detail = VisitorKeyIsRequiredMessage };
}

public sealed record SetCartItemRequest(int Quantity, string? SelectedColor = null, string? SelectedSize = null);
public sealed record SetExternalCartItemRequest(string? ExternalId, int Quantity);
public sealed record SetFavoriteRequest(bool Favorite);
