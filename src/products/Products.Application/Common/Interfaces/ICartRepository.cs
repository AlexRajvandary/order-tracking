using Products.Application.Cart;

using Products.Domain.Entities;

namespace Products.Application.Common.Interfaces
{
    public interface ICartRepository
    {
        public Task<IReadOnlyList<CartItemDto>> GetCartAsync(CatalogStateOwner owner, CancellationToken cancellationToken = default);
        Task<CatalogCartItem?> FindAsync(CatalogStateOwner owner, Guid productId, string selectedColor, string selectedSize, CancellationToken cancellationToken = default);
        void Add(CatalogCartItem item);
        void Remove(CatalogCartItem item);
        Task<ExternalProductCartItem?> FindExternalAsync(CatalogStateOwner owner, string source, string externalId, CancellationToken cancellationToken = default);
        void AddExternal(ExternalProductCartItem item);
        void RemoveExternal(ExternalProductCartItem item);
        Task ClearAsync(CatalogStateOwner owner, CancellationToken cancellationToken = default);
        Task MergeVisitorCartAsync(Guid userId, string visitorKey, CancellationToken cancellationToken = default);
    }
}
