using System.Security.Claims;
using Products.Application.Cart;
using Products.Application.Common.Interfaces;

namespace Products.Api.Services;

public sealed class CatalogOwnerProvider(IHttpContextAccessor accessor) : ICatalogOwnerProvider
{
    private const string VisitorHeader = "X-Catalog-Visitor";

    public CatalogStateOwner? GetCurrentOwner()
    {
        var userId = GetAuthenticatedUserId();

        if (userId is Guid id)
        {
            return CatalogStateOwner.ForUser(id);
        }

        var visitorKey = GetVisitorKey();
        return visitorKey is null ? null : CatalogStateOwner.ForVisitor(visitorKey);
    }

    public Guid? GetAuthenticatedUserId()
    {
        var user = accessor.HttpContext?.User;

        if (user?.Identity?.IsAuthenticated != true)
        {
            return null;
        }

        var value = user.FindFirst("sub")?.Value
            ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        return Guid.TryParse(value, out var id) && id != Guid.Empty ? id : null;
    }

    public string? GetVisitorKey()
    {
        var value = accessor.HttpContext?.Request.Headers[VisitorHeader].FirstOrDefault()?.Trim();
        return CatalogStateOwner.IsValidVisitorKey(value) ? value : null;
    }
}