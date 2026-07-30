using Microsoft.EntityFrameworkCore;
using Moq;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Orders.CancelScheduledStatusHistory;
using OrderTracking.Application.Orders.StatusHistory;
using OrderTracking.Domain.Entities;
using OrderTracking.Domain.Enums;
using OrderTracking.Infrastructure.Persistence;
using OrderTracking.Infrastructure.Persistence.Repositories;
using Xunit;

namespace OrderTracking.Infrastructure.Tests.Orders;

public sealed class StatusScheduleTests
{
    [Fact]
    public async Task CancelScheduled_SoftDeletesUnpublishedEntry()
    {
        await using var db = CreateDbContext();
        var orders = new OrderRepository(db);
        var (orderId, historyId) = await SeedOrderWithScheduledAsync(db, isPublished: false);

        var dateTime = new Mock<IDateTimeProvider>();
        dateTime.Setup(x => x.UtcNow).Returns(DateTimeOffset.UtcNow);

        var handler = new CancelScheduledStatusHistoryCommandHandler(orders, db, dateTime.Object);
        await handler.Handle(new CancelScheduledStatusHistoryCommand(orderId, historyId), CancellationToken.None);

        Assert.Empty(await db.OrderItemStatusHistories.ToListAsync());
    }

    [Fact]
    public async Task CancelScheduled_RejectsPublishedEntry()
    {
        await using var db = CreateDbContext();
        var orders = new OrderRepository(db);
        var (orderId, historyId) = await SeedOrderWithScheduledAsync(db, isPublished: true);

        var dateTime = new Mock<IDateTimeProvider>();
        dateTime.Setup(x => x.UtcNow).Returns(DateTimeOffset.UtcNow);

        var handler = new CancelScheduledStatusHistoryCommandHandler(orders, db, dateTime.Object);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            handler.Handle(new CancelScheduledStatusHistoryCommand(orderId, historyId), CancellationToken.None));
    }

    [Fact]
    public async Task SeedForItems_CreatesUnpublishedHistoryWithPublishAt()
    {
        await using var db = CreateDbContext();
        var orders = new OrderRepository(db);
        var statuses = new StatusDefinitionRepository(db);
        var createdAt = new DateTimeOffset(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);
        var adminId = Guid.NewGuid();

        db.AdminUsers.Add(new AdminUser
        {
            Id = adminId,
            Login = "admin",
            PasswordHash = "x",
            DisplayName = "Admin",
            CreatedAt = createdAt,
        });

        db.StatusDefinitions.Add(new StatusDefinition
        {
            Id = Guid.NewGuid(),
            Name = "In warehouse",
            ItemType = OrderItemType.Product,
            DefaultCountry = "China",
            DefaultLocation = "Warehouse A",
            PublishAfterDays = 3,
            IsActive = true,
            CreatedAt = createdAt,
        });

        var order = new Order
        {
            Id = Guid.NewGuid(),
            TrackingCode = "ABC12",
            CreatedByAdminId = adminId,
            Status = OrderStatus.AwaitingPayment,
            CreatedAt = createdAt,
        };
        var item = new OrderItem
        {
            Id = Guid.NewGuid(),
            OrderId = order.Id,
            ItemType = OrderItemType.Product,
            Name = "Item",
            Quantity = 1,
            SortOrder = 0,
            CreatedAt = createdAt,
        };

        db.Orders.Add(order);
        db.OrderItems.Add(item);
        await db.SaveChangesAsync();

        await ScheduledStatusHistorySeeder.SeedForItemsAsync(
            orders,
            statuses,
            order,
            [item],
            adminId,
            CancellationToken.None);
        await db.SaveChangesAsync();

        var history = Assert.Single(await db.OrderItemStatusHistories.ToListAsync());
        Assert.False(history.IsPublished);
        Assert.Equal("China", history.Country);
        Assert.Equal("Warehouse A", history.Location);
        Assert.Equal(createdAt.AddDays(3), history.PublishAt);
    }

    [Fact]
    public async Task SyncFromPublishedHistory_IgnoresUnpublished()
    {
        await using var db = CreateDbContext();
        var orders = new OrderRepository(db);
        var createdAt = DateTimeOffset.UtcNow;
        var adminId = Guid.NewGuid();

        db.AdminUsers.Add(new AdminUser
        {
            Id = adminId,
            Login = "admin",
            PasswordHash = "x",
            DisplayName = "Admin",
            CreatedAt = createdAt,
        });

        var order = new Order
        {
            Id = Guid.NewGuid(),
            TrackingCode = "XYZ99",
            CreatedByAdminId = adminId,
            Status = OrderStatus.InProgress,
            CreatedAt = createdAt,
        };
        var item = new OrderItem
        {
            Id = Guid.NewGuid(),
            OrderId = order.Id,
            ItemType = OrderItemType.Product,
            Name = "Item",
            Quantity = 1,
            SortOrder = 0,
            CreatedAt = createdAt,
            CurrentStatusText = "Old",
        };

        db.Orders.Add(order);
        db.OrderItems.Add(item);
        db.OrderItemStatusHistories.Add(new OrderItemStatusHistory
        {
            Id = Guid.NewGuid(),
            OrderItemId = item.Id,
            StatusText = "Scheduled",
            IsPublished = false,
            PublishAt = createdAt.AddDays(1),
            ChangedByAdminId = adminId,
            ChangedAt = createdAt.AddDays(1),
        });
        db.OrderItemStatusHistories.Add(new OrderItemStatusHistory
        {
            Id = Guid.NewGuid(),
            OrderItemId = item.Id,
            StatusText = "Published",
            IsPublished = true,
            PublishAt = createdAt,
            ChangedByAdminId = adminId,
            ChangedAt = createdAt,
        });
        await db.SaveChangesAsync();

        await OrderItemCurrentStatusSync.SyncFromPublishedHistoryAsync(orders, item, CancellationToken.None);

        Assert.Equal("Published", item.CurrentStatusText);
    }

    [Fact]
    public async Task AlignCreatedAt_UsesEarliestStatusDateWhenBackdated()
    {
        await using var db = CreateDbContext();
        var orders = new OrderRepository(db);
        var orderCreatedAt = new DateTimeOffset(2026, 6, 10, 12, 0, 0, TimeSpan.Zero);
        var backdated = orderCreatedAt.AddDays(-5);
        var (orderId, _) = await SeedOrderWithStatusAsync(
            db,
            orderCreatedAt,
            statusChangedAt: orderCreatedAt.AddDays(1),
            isPublished: true);

        var order = await orders.GetByIdTrackedAsync(orderId);
        Assert.NotNull(order);

        await OrderCreatedAtSync.AlignToEarliestStatusAsync(
            orders,
            order!,
            now: orderCreatedAt.AddHours(1),
            CancellationToken.None,
            pendingChangedAt: backdated);

        Assert.Equal(backdated, order!.CreatedAt);
    }

    [Fact]
    public async Task AlignCreatedAt_IgnoresFutureOnlyStatuses()
    {
        await using var db = CreateDbContext();
        var orders = new OrderRepository(db);
        var orderCreatedAt = new DateTimeOffset(2026, 6, 10, 12, 0, 0, TimeSpan.Zero);
        var (orderId, _) = await SeedOrderWithStatusAsync(
            db,
            orderCreatedAt,
            statusChangedAt: orderCreatedAt.AddDays(3),
            isPublished: false);

        var order = await orders.GetByIdTrackedAsync(orderId);
        Assert.NotNull(order);

        await OrderCreatedAtSync.AlignToEarliestStatusAsync(
            orders,
            order!,
            now: orderCreatedAt,
            CancellationToken.None);

        Assert.Equal(orderCreatedAt, order!.CreatedAt);
    }

    [Fact]
    public async Task AlignCreatedAt_MatchesFirstStatusDate()
    {
        await using var db = CreateDbContext();
        var orders = new OrderRepository(db);
        var orderCreatedAt = new DateTimeOffset(2026, 6, 10, 12, 0, 0, TimeSpan.Zero);
        var firstStatusAt = orderCreatedAt.AddHours(-2);
        var (orderId, _) = await SeedOrderWithStatusAsync(
            db,
            orderCreatedAt,
            statusChangedAt: firstStatusAt,
            isPublished: true);

        var order = await orders.GetByIdTrackedAsync(orderId);
        Assert.NotNull(order);

        await OrderCreatedAtSync.AlignToEarliestStatusAsync(
            orders,
            order!,
            now: orderCreatedAt,
            CancellationToken.None);

        Assert.Equal(firstStatusAt, order!.CreatedAt);
    }

    private static async Task<(Guid OrderId, Guid HistoryId)> SeedOrderWithStatusAsync(
        ApplicationDbContext db,
        DateTimeOffset orderCreatedAt,
        DateTimeOffset statusChangedAt,
        bool isPublished)
    {
        var adminId = Guid.NewGuid();
        var orderId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        var historyId = Guid.NewGuid();

        db.AdminUsers.Add(new AdminUser
        {
            Id = adminId,
            Login = "admin",
            PasswordHash = "x",
            DisplayName = "Admin",
            CreatedAt = orderCreatedAt,
        });
        db.Orders.Add(new Order
        {
            Id = orderId,
            TrackingCode = "CR01",
            CreatedByAdminId = adminId,
            Status = OrderStatus.AwaitingPayment,
            CreatedAt = orderCreatedAt,
        });
        db.OrderItems.Add(new OrderItem
        {
            Id = itemId,
            OrderId = orderId,
            ItemType = OrderItemType.Product,
            Name = "Item",
            Quantity = 1,
            SortOrder = 0,
            CreatedAt = orderCreatedAt,
        });
        db.OrderItemStatusHistories.Add(new OrderItemStatusHistory
        {
            Id = historyId,
            OrderItemId = itemId,
            StatusText = "Status",
            IsPublished = isPublished,
            PublishAt = statusChangedAt,
            ChangedByAdminId = adminId,
            ChangedAt = statusChangedAt,
        });
        await db.SaveChangesAsync();
        return (orderId, historyId);
    }

    private static async Task<(Guid OrderId, Guid HistoryId)> SeedOrderWithScheduledAsync(
        ApplicationDbContext db,
        bool isPublished)
    {
        var createdAt = DateTimeOffset.UtcNow;
        var adminId = Guid.NewGuid();
        var orderId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        var historyId = Guid.NewGuid();

        db.AdminUsers.Add(new AdminUser
        {
            Id = adminId,
            Login = "admin",
            PasswordHash = "x",
            DisplayName = "Admin",
            CreatedAt = createdAt,
        });
        db.Orders.Add(new Order
        {
            Id = orderId,
            TrackingCode = "SCH01",
            CreatedByAdminId = adminId,
            Status = OrderStatus.AwaitingPayment,
            CreatedAt = createdAt,
        });
        db.OrderItems.Add(new OrderItem
        {
            Id = itemId,
            OrderId = orderId,
            ItemType = OrderItemType.Product,
            Name = "Item",
            Quantity = 1,
            SortOrder = 0,
            CreatedAt = createdAt,
        });
        db.OrderItemStatusHistories.Add(new OrderItemStatusHistory
        {
            Id = historyId,
            OrderItemId = itemId,
            StatusText = "Later",
            IsPublished = isPublished,
            PublishAt = createdAt.AddDays(2),
            ChangedByAdminId = adminId,
            ChangedAt = createdAt.AddDays(2),
        });
        await db.SaveChangesAsync();
        return (orderId, historyId);
    }

    private static ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }
}
