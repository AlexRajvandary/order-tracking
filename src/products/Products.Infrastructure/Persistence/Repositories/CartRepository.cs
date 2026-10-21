using Microsoft.EntityFrameworkCore;
using Products.Application.Cart;
using Products.Application.Common.Interfaces;
using Products.Domain.Entities;

namespace Products.Infrastructure.Persistence.Repositories
{
    public class CartRepository(ProductsDbContext db, IDateTimeProvider dateTimeProvider) : ICartRepository
    {
        private readonly ProductsDbContext _db = db;

        public async Task<IReadOnlyList<CartItemDto>> GetCartAsync(CatalogStateOwner owner, CancellationToken cancellationToken = default)
        {
            var rows = await OwnedBy(_db.CatalogCartItems.AsNoTracking()
                .Include(x => x.Product).ThenInclude(product => product.Shop), owner)
                .OrderByDescending(x => x.UpdatedAt)
                .ToListAsync(cancellationToken);

            var external = await OwnedBy(_db.ExternalProductCartItems.AsNoTracking(), owner)
                .OrderByDescending(x => x.UpdatedAt)
                .ToListAsync(cancellationToken);

            var result = rows.Select(CartItemMappings.ToDto).Concat(external.Select(CartItemMappings.ToDto)).OrderByDescending(x => x.UpdatedAt).ToList();

            return result;
        }

        public Task<CatalogCartItem?> FindAsync(CatalogStateOwner owner, Guid productId, string selectedColor, string selectedSize, CancellationToken cancellationToken = default) =>
            OwnedBy(_db.CatalogCartItems.Where(item => item.ProductId == productId
                    && item.SelectedColor == selectedColor && item.SelectedSize == selectedSize), owner)
                .SingleOrDefaultAsync(cancellationToken);

        public void Add(CatalogCartItem item) => _db.CatalogCartItems.Add(item);

        public void Remove(CatalogCartItem item) => _db.CatalogCartItems.Remove(item);

        public Task<ExternalProductCartItem?> FindExternalAsync(CatalogStateOwner owner, string source, string externalId, CancellationToken cancellationToken = default) =>
            OwnedBy(_db.ExternalProductCartItems.Where(item => item.Source == source && item.ExternalId == externalId), owner)
                .SingleOrDefaultAsync(cancellationToken);

        public void AddExternal(ExternalProductCartItem item) => _db.ExternalProductCartItems.Add(item);

        public void RemoveExternal(ExternalProductCartItem item) => _db.ExternalProductCartItems.Remove(item);

        public async Task ClearAsync(CatalogStateOwner owner, CancellationToken cancellationToken = default)
        {
            await OwnedBy(_db.CatalogCartItems, owner).ExecuteDeleteAsync(cancellationToken);
            await OwnedBy(_db.ExternalProductCartItems, owner).ExecuteDeleteAsync(cancellationToken);
        }

        public async Task MergeVisitorCartAsync(Guid userId, string visitorKey, CancellationToken cancellationToken = default)
        {
            var guestCart = await _db.CatalogCartItems.Where(item => item.VisitorKey == visitorKey)
                .ToListAsync(cancellationToken);
            var accountCart = await _db.CatalogCartItems.Where(item => item.UserId == userId)
                .ToDictionaryAsync(item => CartKey(item.ProductId, item.SelectedColor, item.SelectedSize), cancellationToken);

            foreach (var item in guestCart)
            {
                var key = CartKey(item.ProductId, item.SelectedColor, item.SelectedSize);
                if (accountCart.TryGetValue(key, out var existing))
                {
                    existing.Quantity = Math.Min(999, existing.Quantity + item.Quantity);
                    existing.UpdatedAt = dateTimeProvider.UtcNow;
                    _db.CatalogCartItems.Remove(item);
                }
                else
                {
                    item.UserId = userId;
                    item.VisitorKey = null;
                    accountCart[key] = item;
                }
            }

            var guestExternal = await _db.ExternalProductCartItems.Where(item => item.VisitorKey == visitorKey)
                .ToListAsync(cancellationToken);
            var accountExternal = await _db.ExternalProductCartItems.Where(item => item.UserId == userId)
                .ToListAsync(cancellationToken);
            var externalByKey = new Dictionary<string, ExternalProductCartItem>(StringComparer.Ordinal);
            foreach (var item in accountExternal)
            {
                var normalizedId = item.ExternalId.Trim();
                var key = ExternalCartKey(item.Source, normalizedId);
                if (externalByKey.TryGetValue(key, out var duplicate))
                {
                    duplicate.Quantity = Math.Min(100, duplicate.Quantity + item.Quantity);
                    _db.ExternalProductCartItems.Remove(item);
                }
                else
                {
                    externalByKey[key] = item;
                }
            }

            foreach (var item in guestExternal)
            {
                item.ExternalId = item.ExternalId.Trim();
                var key = ExternalCartKey(item.Source, item.ExternalId);
                if (externalByKey.TryGetValue(key, out var existing))
                {
                    existing.Quantity = Math.Min(100, existing.Quantity + item.Quantity);
                    existing.UpdatedAt = dateTimeProvider.UtcNow;
                    _db.ExternalProductCartItems.Remove(item);
                }
                else
                {
                    item.UserId = userId;
                    item.VisitorKey = null;
                    externalByKey[key] = item;
                }
            }
        }

        private static string CartKey(Guid productId, string color, string size) => $"{productId:N}\u001f{color}\u001f{size}";

        private static string ExternalCartKey(string source, string externalId) => $"{source.Trim().ToUpperInvariant()}\u001f{externalId}";

        private static IQueryable<CatalogCartItem> OwnedBy(IQueryable<CatalogCartItem> query, CatalogStateOwner owner) =>
            owner.UserId is Guid userId
                ? query.Where(x => x.UserId == userId)
                : query.Where(x => x.VisitorKey == owner.VisitorKey);

        private static IQueryable<ExternalProductCartItem> OwnedBy(IQueryable<ExternalProductCartItem> query, CatalogStateOwner owner) =>
            owner.UserId is Guid userId
                ? query.Where(x => x.UserId == userId)
                : query.Where(x => x.VisitorKey == owner.VisitorKey);

        private static IQueryable<CatalogFavorite> OwnedBy(IQueryable<CatalogFavorite> query, CatalogStateOwner owner) =>
            owner.UserId is Guid userId
                ? query.Where(x => x.UserId == userId)
                : query.Where(x => x.VisitorKey == owner.VisitorKey);
    }
}
