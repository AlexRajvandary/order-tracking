using Products.Application.Cart;

namespace Products.Application.Common.Interfaces;

public interface ICatalogOwnerProvider
{
    CatalogStateOwner? GetCurrentOwner();
    Guid? GetAuthenticatedUserId();
    string? GetVisitorKey();
}
