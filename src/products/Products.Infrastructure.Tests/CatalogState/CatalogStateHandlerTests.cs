using Products.Application.Cart;
using Products.Application.Cart.ClearCart;
using Products.Application.Cart.GetCart;
using Products.Application.Cart.MergeVisitorState;
using Products.Application.Cart.SetCart;
using Products.Application.Cart.SetRakutenCartItem;
using Products.Application.Common.Interfaces;
using Products.Application.ExternalProducts;
using Products.Application.Favorites.ClearFavorites;
using Products.Application.Favorites.GetFavorites;
using Products.Application.Favorites.SetFavorite;
using Products.Domain.Entities;
using Xunit;

namespace Products.Infrastructure.Tests.CatalogState;

public sealed class CatalogStateHandlerTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task GetCart_UsesCurrentAccountOrVisitor(bool authenticated)
    {
        var owner = authenticated
            ? CatalogStateOwner.ForUser(Guid.NewGuid())
            : CatalogStateOwner.ForVisitor("visitor_123");
        var owners = new FakeOwnerProvider(owner);
        var cart = new FakeCartRepository();
        var handler = new GetCartQueryHandler(cart, owners);

        var result = await handler.Handle(new GetCartQuery(), CancellationToken.None);

        Assert.IsType<GetCartResult.Success>(result);
        Assert.Equal<CatalogStateOwner?>(owner, cart.LastOwner);
    }

    [Fact]
    public async Task GetCart_RejectsMissingOrInvalidOwner()
    {
        var handler = new GetCartQueryHandler(new FakeCartRepository(), new FakeOwnerProvider(null));

        Assert.IsType<GetCartResult.OwnerRequired>(await handler.Handle(new GetCartQuery(), CancellationToken.None));
        Assert.False(CatalogStateOwner.IsValidVisitorKey("bad visitor key"));
        Assert.False(CatalogStateOwner.IsValidVisitorKey(new string('x', 65)));
    }

    [Fact]
    public async Task SetCart_AddsAndUpdatesInternalItemWithQuantityLimit()
    {
        var owner = CatalogStateOwner.ForVisitor("visitor-1");
        var cart = new FakeCartRepository();
        var unitOfWork = new FakeUnitOfWork();
        var handler = new SetCartItemCommandHandler(cart, new FakeCatalogProductRepository(Product()), new FakeOwnerProvider(owner), unitOfWork, new FakeClock());

        var add = await handler.Handle(new SetCartItemCommand(ProductId, 2, " Navy ", " M "), CancellationToken.None);
        var update = await handler.Handle(new SetCartItemCommand(ProductId, 1200, "Navy", "M"), CancellationToken.None);

        var added = Assert.IsType<SetCartItemResult.Updated>(add);
        var updated = Assert.IsType<SetCartItemResult.Updated>(update);
        Assert.Equal(2, added.Item.Quantity);
        Assert.Equal(999, updated.Item.Quantity);
        Assert.Equal("Navy", Assert.Single(cart.InternalItems).SelectedColor);
        Assert.Equal(2, unitOfWork.TransactionCount);
    }

    [Fact]
    public async Task SetCart_RemovesInactiveProductBeforeAvailabilityValidation()
    {
        var owner = CatalogStateOwner.ForUser(Guid.NewGuid());
        var cart = new FakeCartRepository();
        cart.InternalItems.Add(new CatalogCartItem
        {
            Id = Guid.NewGuid(), ProductId = ProductId, UserId = owner.UserId,
            SelectedColor = "old-color", SelectedSize = "old-size", Quantity = 1,
        });
        var handler = new SetCartItemCommandHandler(cart, new FakeCatalogProductRepository(null), new FakeOwnerProvider(owner), new FakeUnitOfWork(), new FakeClock());

        var result = await handler.Handle(new SetCartItemCommand(ProductId, 0, "old-color", "old-size"), CancellationToken.None);

        Assert.IsType<SetCartItemResult.Deleted>(result);
        Assert.Empty(cart.InternalItems);
    }

    [Fact]
    public async Task SetCart_RejectsUnavailableOptionsAndOverlongInput()
    {
        var owner = CatalogStateOwner.ForVisitor("v1");
        var productRepository = new FakeCatalogProductRepository(Product()) { HasColor = false };
        var handler = new SetCartItemCommandHandler(new FakeCartRepository(), productRepository, new FakeOwnerProvider(owner), new FakeUnitOfWork(), new FakeClock());

        Assert.IsType<SetCartItemResult.InvalidOption>(await handler.Handle(new SetCartItemCommand(ProductId, 1, "Blue"), CancellationToken.None));
        productRepository.HasColor = true;
        var tooLong = await handler.Handle(new SetCartItemCommand(ProductId, 1, new string('c', 201)), CancellationToken.None);
        Assert.IsType<SetCartItemResult.InvalidOption>(tooLong);
    }

    [Fact]
    public async Task Favorites_AddRemoveAndClearAreOwnerScoped()
    {
        var owner = CatalogStateOwner.ForVisitor("v_fav");
        var repository = new FakeFavoriteRepository();
        var unitOfWork = new FakeUnitOfWork();
        var products = new FakeCatalogProductRepository(Product());
        var setHandler = new SetFavoriteCommandHandler(repository, products, new FakeOwnerProvider(owner), unitOfWork, new FakeClock());

        Assert.IsType<SetFavoriteResult.Updated>(await setHandler.Handle(new SetFavoriteCommand(ProductId, true), CancellationToken.None));
        Assert.IsType<SetFavoriteResult.Updated>(await setHandler.Handle(new SetFavoriteCommand(ProductId, true), CancellationToken.None));
        Assert.Single(repository.Items);
        Assert.Equal("v_fav", Assert.Single(repository.Items).VisitorKey);

        Assert.IsType<SetFavoriteResult.Updated>(await setHandler.Handle(new SetFavoriteCommand(ProductId, false), CancellationToken.None));
        Assert.Empty(repository.Items);
        var clearHandler = new ClearFavoritesCommandHandler(repository, new FakeOwnerProvider(owner), unitOfWork);
        Assert.IsType<ClearFavoritesResult.Cleared>(await clearHandler.Handle(new ClearFavoritesCommand(), CancellationToken.None));
        Assert.Equal(4, unitOfWork.TransactionCount);
    }

    [Fact]
    public async Task FavoriteCannotBeAddedForInactiveProduct()
    {
        var repository = new FakeFavoriteRepository();
        var handler = new SetFavoriteCommandHandler(repository, new FakeCatalogProductRepository(null), new FakeOwnerProvider(CatalogStateOwner.ForUser(Guid.NewGuid())), new FakeUnitOfWork(), new FakeClock());

        Assert.IsType<SetFavoriteResult.ProductNotFound>(await handler.Handle(new SetFavoriteCommand(ProductId, true), CancellationToken.None));
        Assert.Empty(repository.Items);
    }

    [Fact]
    public async Task ClearCartRunsBothCartDeletesInsideOneTransaction()
    {
        var cart = new FakeCartRepository();
        var ownerId = Guid.NewGuid();
        cart.InternalItems.Add(new CatalogCartItem { Id = Guid.NewGuid(), ProductId = ProductId, UserId = ownerId, Quantity = 1 });
        cart.ExternalItems.Add(new ExternalProductCartItem { Id = Guid.NewGuid(), UserId = ownerId, ExternalId = "store:item", Quantity = 1 });
        var unitOfWork = new FakeUnitOfWork();
        var handler = new ClearCartCommandHandler(cart, new FakeOwnerProvider(CatalogStateOwner.ForUser(ownerId)), unitOfWork);

        Assert.IsType<ClearCartResult.Cleared>(await handler.Handle(new ClearCartCommand(), CancellationToken.None));
        Assert.Empty(cart.InternalItems);
        Assert.Empty(cart.ExternalItems);
        Assert.Equal(1, cart.ClearCalls);
        Assert.Equal(1, unitOfWork.TransactionCount);
    }

    [Fact]
    public async Task RakutenCartNormalizesIdUpdatesMetadataAndDeletesWithoutExternalCall()
    {
        var owner = CatalogStateOwner.ForVisitor("v_rakuten");
        var cart = new FakeCartRepository();
        var rakuten = new FakeRakutenClient(ExternalProduct());
        var unitOfWork = new FakeUnitOfWork();
        var handler = new SetRakutenCartItemCommandHandler(cart, new FakeOwnerProvider(owner), rakuten, unitOfWork, new FakeClock());

        var result = await handler.Handle(new SetRakutenCartItemCommand("  shop:item-1  ", 150), CancellationToken.None);
        var updated = Assert.IsType<SetRakutenCartItemResult.Updated>(result);
        var row = Assert.Single(cart.ExternalItems);
        Assert.Equal("shop:item-1", row.ExternalId);
        Assert.Equal(100, updated.Item.Quantity);
        Assert.Equal(1, rakuten.GetCalls);

        Assert.IsType<SetRakutenCartItemResult.Deleted>(await handler.Handle(new SetRakutenCartItemCommand(" shop:item-1 ", 0), CancellationToken.None));
        Assert.Empty(cart.ExternalItems);
        Assert.Equal(1, rakuten.GetCalls);
    }

    [Fact]
    public async Task RakutenCartMapsNotFoundUnavailableAndUnavailableItem()
    {
        var owner = CatalogStateOwner.ForVisitor("v_rakuten_errors");
        var cart = new FakeCartRepository();
        var unitOfWork = new FakeUnitOfWork();
        var notFound = new SetRakutenCartItemCommandHandler(cart, new FakeOwnerProvider(owner), new FakeRakutenClient(null), unitOfWork, new FakeClock());
        Assert.IsType<SetRakutenCartItemResult.NotFound>(await notFound.Handle(new SetRakutenCartItemCommand("unknown", 1), CancellationToken.None));

        var unavailable = new SetRakutenCartItemCommandHandler(cart, new FakeOwnerProvider(owner), new FakeRakutenClient(null, true), unitOfWork, new FakeClock());
        Assert.IsType<SetRakutenCartItemResult.Unavailable>(await unavailable.Handle(new SetRakutenCartItemCommand("item", 1), CancellationToken.None));

        var unavailableItem = new SetRakutenCartItemCommandHandler(cart, new FakeOwnerProvider(owner), new FakeRakutenClient(ExternalProduct() with { Available = false }), unitOfWork, new FakeClock());
        Assert.IsType<SetRakutenCartItemResult.ProductUnavailable>(await unavailableItem.Handle(new SetRakutenCartItemCommand("item", 1), CancellationToken.None));
        Assert.Empty(cart.ExternalItems);
    }

    [Fact]
    public async Task MergeVisitorStateUsesOneTransactionForCartAndFavorites()
    {
        var cart = new FakeCartRepository();
        var favorites = new FakeFavoriteRepository();
        var unitOfWork = new FakeUnitOfWork();
        var userId = Guid.NewGuid();
        var handler = new MergeVisitorStateCommandHandler(
            cart, favorites, new FakeOwnerProvider(CatalogStateOwner.ForUser(userId), visitorKey: " visitor-merge "), unitOfWork);

        Assert.IsType<MergeVisitorStateResult.Merged>(await handler.Handle(new MergeVisitorStateCommand(), CancellationToken.None));

        Assert.Equal((userId, "visitor-merge"), cart.LastMerge);
        Assert.Equal((userId, "visitor-merge"), favorites.LastMerge);
        Assert.Equal(1, unitOfWork.TransactionCount);
    }

    [Fact]
    public async Task MergeVisitorStateRejectsInvalidOwnerData()
    {
        var unitOfWork = new FakeUnitOfWork();
        var handler = new MergeVisitorStateCommandHandler(
            new FakeCartRepository(), new FakeFavoriteRepository(), new FakeOwnerProvider(null), unitOfWork);

        Assert.IsType<MergeVisitorStateResult.InvalidOwner>(await handler.Handle(new MergeVisitorStateCommand(), CancellationToken.None));
        Assert.Equal(0, unitOfWork.TransactionCount);
    }

    private static Product Product() => new()
    {
        Id = ProductId, IsActive = true, Name = "Item", Slug = "item", Price = 50,
        CurrencyCode = "JPY", Shop = new Shop { Name = "Shop" },
    };

    private static ExternalCatalogProductDto ExternalProduct() => new(
        "rakuten:item", ProductSource.Rakuten, null, "shop:item-1", "Item", "Description",
        120, "JPY", "https://image", "https://source", "https://affiliate", "shop", "Shop",
        1, true, 4.5m, 12, true);

    private static readonly Guid ProductId = Guid.Parse("a2d20a72-a504-4eb4-a886-693de3145f30");

    private sealed class FakeOwnerProvider(CatalogStateOwner? owner, string? visitorKey = null) : ICatalogOwnerProvider
    {
        public CatalogStateOwner? GetCurrentOwner() => owner;
        public Guid? GetAuthenticatedUserId() => owner?.UserId;
        public string? GetVisitorKey() => visitorKey ?? owner?.VisitorKey;
    }

    private sealed class FakeClock : IDateTimeProvider
    {
        public DateTimeOffset UtcNow { get; } = DateTimeOffset.Parse("2026-10-21T12:00:00Z");
    }

    private sealed class FakeUnitOfWork : IUnitOfWork
    {
        public int TransactionCount { get; private set; }
        public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) => Task.FromResult(0);
        public async Task ExecuteInTransactionAsync(Func<CancellationToken, Task> operation, CancellationToken cancellationToken = default)
        {
            TransactionCount++;
            await operation(cancellationToken);
        }
    }

    private sealed class FakeCatalogProductRepository(Product? product) : ICatalogProductRepository
    {
        public bool HasColor { get; set; } = true;
        public bool HasSize { get; set; } = true;
        public Task<Product?> GetActiveForCartAsync(Guid id, CancellationToken cancellationToken = default) =>
            Task.FromResult(product is { IsActive: true } && product.Id == id ? product : null);
        public Task<bool> HasColorAsync(Guid productId, string color, CancellationToken cancellationToken = default) => Task.FromResult(HasColor);
        public Task<bool> HasSizeAsync(Guid productId, string size, CancellationToken cancellationToken = default) => Task.FromResult(HasSize);
    }

    private sealed class FakeCartRepository : ICartRepository
    {
        public List<CatalogCartItem> InternalItems { get; } = [];
        public List<ExternalProductCartItem> ExternalItems { get; } = [];
        public CatalogStateOwner? LastOwner { get; private set; }
        public (Guid UserId, string VisitorKey)? LastMerge { get; private set; }
        public int ClearCalls { get; private set; }

        public Task<IReadOnlyList<CartItemDto>> GetCartAsync(CatalogStateOwner owner, CancellationToken cancellationToken = default)
        {
            LastOwner = owner;
            return Task.FromResult<IReadOnlyList<CartItemDto>>([]);
        }

        public Task<CatalogCartItem?> FindAsync(CatalogStateOwner owner, Guid productId, string selectedColor, string selectedSize, CancellationToken cancellationToken = default) =>
            Task.FromResult(InternalItems.SingleOrDefault(item => IsOwner(item.UserId, item.VisitorKey, owner)
                && item.ProductId == productId && item.SelectedColor == selectedColor && item.SelectedSize == selectedSize));

        public void Add(CatalogCartItem item) => InternalItems.Add(item);
        public void Remove(CatalogCartItem item) => InternalItems.Remove(item);

        public Task<ExternalProductCartItem?> FindExternalAsync(CatalogStateOwner owner, string source, string externalId, CancellationToken cancellationToken = default) =>
            Task.FromResult(ExternalItems.SingleOrDefault(item => IsOwner(item.UserId, item.VisitorKey, owner)
                && item.Source == source && item.ExternalId == externalId));

        public void AddExternal(ExternalProductCartItem item) => ExternalItems.Add(item);
        public void RemoveExternal(ExternalProductCartItem item) => ExternalItems.Remove(item);

        public Task ClearAsync(CatalogStateOwner owner, CancellationToken cancellationToken = default)
        {
            ClearCalls++;
            InternalItems.RemoveAll(item => IsOwner(item.UserId, item.VisitorKey, owner));
            ExternalItems.RemoveAll(item => IsOwner(item.UserId, item.VisitorKey, owner));
            return Task.CompletedTask;
        }

        public Task MergeVisitorCartAsync(Guid userId, string visitorKey, CancellationToken cancellationToken = default)
        {
            LastMerge = (userId, visitorKey);
            return Task.CompletedTask;
        }

        private static bool IsOwner(Guid? userId, string? key, CatalogStateOwner owner) =>
            owner.UserId is Guid id ? userId == id : key == owner.VisitorKey;
    }

    private sealed class FakeFavoriteRepository : IFavoriteRepository
    {
        public List<CatalogFavorite> Items { get; } = [];
        public (Guid UserId, string VisitorKey)? LastMerge { get; private set; }
        public Task<IReadOnlyList<Guid>> GetProductIdsAsync(CatalogStateOwner owner, CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<Guid>>(Items.Where(item => IsOwner(item.UserId, item.VisitorKey, owner)).Select(item => item.ProductId).ToList());
        public Task<CatalogFavorite?> FindAsync(CatalogStateOwner owner, Guid productId, CancellationToken cancellationToken = default) =>
            Task.FromResult(Items.SingleOrDefault(item => IsOwner(item.UserId, item.VisitorKey, owner) && item.ProductId == productId));
        public void Add(CatalogFavorite favorite)
        {
            if (Items.All(item => item.UserId != favorite.UserId || item.VisitorKey != favorite.VisitorKey || item.ProductId != favorite.ProductId))
                Items.Add(favorite);
        }
        public void Remove(CatalogFavorite favorite) => Items.Remove(favorite);
        public Task ClearAsync(CatalogStateOwner owner, CancellationToken cancellationToken = default)
        {
            Items.RemoveAll(item => IsOwner(item.UserId, item.VisitorKey, owner));
            return Task.CompletedTask;
        }
        public Task MergeVisitorFavoritesAsync(Guid userId, string visitorKey, CancellationToken cancellationToken = default)
        {
            LastMerge = (userId, visitorKey);
            return Task.CompletedTask;
        }
        private static bool IsOwner(Guid? userId, string? key, CatalogStateOwner owner) =>
            owner.UserId is Guid id ? userId == id : key == owner.VisitorKey;
    }

    private sealed class FakeRakutenClient(ExternalCatalogProductDto? product, bool throwUnavailable = false) : IRakutenCatalogClient
    {
        public bool IsConfigured => true;
        public int GetCalls { get; private set; }
        public Task<ExternalCatalogSearchResult> SearchAsync(RakutenSearchRequest request, CancellationToken cancellationToken) =>
            throw new NotSupportedException();
        public Task<ExternalCatalogProductDto?> GetByItemCodeAsync(string itemCode, CancellationToken cancellationToken)
        {
            GetCalls++;
            if (throwUnavailable)
                throw new ExternalCatalogUnavailableException("Rakuten unavailable");
            return Task.FromResult(product);
        }
    }
}
