using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Api.Controllers;
using OrderTracking.Domain.Entities;
using OrderTracking.Domain.Enums;
using OrderTracking.Infrastructure.Persistence;
using Xunit;

namespace OrderTracking.Infrastructure.Tests.Orders;

public sealed class ProcurementsControllerTests
{
    [Fact]
    public async Task Convert_creates_one_row_per_item_and_is_idempotent()
    {
        await using var db = CreateDbContext();
        var order = CreateOrder(2);
        db.Orders.Add(order);
        await db.SaveChangesAsync();
        var controller = new ProcurementsController(db);

        var first = await controller.ConvertOrder(order.Id, CancellationToken.None);
        var second = await controller.ConvertOrder(order.Id, CancellationToken.None);

        Assert.IsType<OkObjectResult>(first.Result);
        Assert.IsType<OkObjectResult>(second.Result);
        Assert.Equal(2, await db.OrderItemProcurements.CountAsync());
        Assert.Equal(2, await db.OrderItemProcurementStatusHistories.CountAsync());
        Assert.Equal(OrderStatus.InProgress, order.Status);
    }

    [Fact]
    public async Task Delete_removes_only_auxiliary_row()
    {
        await using var db = CreateDbContext();
        var order = CreateOrder(1);
        db.Orders.Add(order);
        await db.SaveChangesAsync();
        var row = new OrderItemProcurement
        {
            Id = Guid.NewGuid(),
            OrderItemId = order.Items.Single().Id,
        };
        db.OrderItemProcurements.Add(row);
        await db.SaveChangesAsync();
        var controller = new ProcurementsController(db);

        var result = await controller.Delete(row.Id, CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        Assert.Equal(0, await db.OrderItemProcurements.CountAsync());
        Assert.Equal(1, await db.OrderItems.CountAsync());
        Assert.Equal(1, await db.Orders.CountAsync());
    }

    [Fact]
    public async Task Update_persists_extended_procurement_fields()
    {
        await using var db = CreateDbContext();
        var order = CreateOrder(1);
        var row = new OrderItemProcurement
        {
            Id = Guid.NewGuid(),
            OrderItemId = order.Items.Single().Id,
        };
        db.Orders.Add(order);
        db.OrderItemProcurements.Add(row);
        await db.SaveChangesAsync();
        var controller = new ProcurementsController(db);
        var receivedAt = new DateOnly(2026, 9, 28);
        var shippedAt = new DateOnly(2026, 9, 29);

        var result = await controller.Update(
            row.Id,
            new UpdateProcurementRequest(
                " https://shop.example/order/42 ",
                125.50m,
                "USD",
                " SELLER-42 ",
                " LOCAL-TRACK ",
                receivedAt,
                WarehouseCondition.Ok,
                " INTERNATIONAL-TRACK ",
                "Air",
                1.250m,
                32.75m,
                "EUR",
                shippedAt),
            CancellationToken.None);

        var dto = Assert.IsType<ProcurementRowDto>(Assert.IsType<OkObjectResult>(result.Result).Value);
        db.ChangeTracker.Clear();
        var saved = await db.OrderItemProcurements.SingleAsync(value => value.Id == row.Id);

        Assert.Equal("https://shop.example/order/42", saved.PurchaseUrl);
        Assert.Equal(125.50m, saved.PurchasePrice);
        Assert.Equal("USD", saved.PurchaseCurrencyCode);
        Assert.Equal("SELLER-42", saved.SellerOrderNumber);
        Assert.Equal("LOCAL-TRACK", saved.WarehouseTrackingNumber);
        Assert.Equal(receivedAt, saved.WarehouseReceivedAt);
        Assert.Equal(WarehouseCondition.Ok, saved.WarehouseCondition);
        Assert.Equal("INTERNATIONAL-TRACK", saved.ShippingTrackingNumber);
        Assert.Equal("Air", saved.ShippingMethod);
        Assert.Equal(1.250m, saved.ShippingWeight);
        Assert.Equal(32.75m, saved.ShippingCost);
        Assert.Equal("EUR", saved.ShippingCurrencyCode);
        Assert.Equal(shippedAt, saved.ShippedAt);
        Assert.Equal(ProcurementLifecycleStatus.RequiredPurchase, saved.CurrentStatus);
        Assert.Empty(dto.Attachments);
    }

    [Fact]
    public async Task Transition_rejects_skipped_states_and_records_valid_changes()
    {
        await using var db = CreateDbContext();
        var order = CreateOrder(1);
        var row = new OrderItemProcurement { Id = Guid.NewGuid(), OrderItemId = order.Items.Single().Id };
        db.Orders.Add(order);
        db.OrderItemProcurements.Add(row);
        await db.SaveChangesAsync();
        var controller = new ProcurementsController(db);

        var skipped = await controller.Transition(row.Id,
            new TransitionProcurementRequest(ProcurementLifecycleStatus.AwaitingWarehouse), CancellationToken.None);
        Assert.IsType<BadRequestObjectResult>(skipped.Result);

        var accepted = await controller.Transition(row.Id,
            new TransitionProcurementRequest(ProcurementLifecycleStatus.Purchased), CancellationToken.None);
        Assert.IsType<OkObjectResult>(accepted.Result);
        Assert.Equal(ProcurementLifecycleStatus.Purchased, row.CurrentStatus);
        var history = await db.OrderItemProcurementStatusHistories.SingleAsync();
        Assert.Equal(ProcurementLifecycleStatus.RequiredPurchase, history.PreviousStatus);
        Assert.Equal(ProcurementLifecycleStatus.Purchased, history.Status);
    }

    [Fact]
    public async Task Blocking_issue_prevents_forward_transition_and_can_be_resolved()
    {
        await using var db = CreateDbContext();
        var order = CreateOrder(1);
        var row = new OrderItemProcurement { Id = Guid.NewGuid(), OrderItemId = order.Items.Single().Id };
        db.Orders.Add(order);
        db.OrderItemProcurements.Add(row);
        await db.SaveChangesAsync();
        var controller = new ProcurementsController(db);

        var created = await controller.CreateError(row.Id, new CreateProcurementErrorRequest("Package damaged"), CancellationToken.None);
        Assert.IsType<CreatedAtActionResult>(created.Result);
        Assert.Equal("purchase", (await db.OrderItemProcurementErrors.SingleAsync()).StageAtCreation);

        var blocked = await controller.Transition(row.Id,
            new TransitionProcurementRequest(ProcurementLifecycleStatus.Purchased), CancellationToken.None);
        Assert.IsType<ConflictObjectResult>(blocked.Result);

        var error = await db.OrderItemProcurementErrors.SingleAsync();
        var resolved = await controller.ResolveError(error.Id, CancellationToken.None);
        Assert.IsType<OkObjectResult>(resolved.Result);
        var accepted = await controller.Transition(row.Id,
            new TransitionProcurementRequest(ProcurementLifecycleStatus.Purchased), CancellationToken.None);
        Assert.IsType<OkObjectResult>(accepted.Result);
        Assert.Equal(ProcurementLifecycleStatus.Purchased, row.CurrentStatus);
    }

    [Fact]
    public async Task Active_board_and_archive_share_the_same_lifecycle_status()
    {
        await using var db = CreateDbContext();
        var order = CreateOrder(2);
        db.Orders.Add(order);
        db.OrderItemProcurements.AddRange(
            new OrderItemProcurement
            {
                Id = Guid.NewGuid(), OrderItemId = order.Items.First().Id,
                CurrentStatus = ProcurementLifecycleStatus.AwaitingTransitShipment,
            },
            new OrderItemProcurement
            {
                Id = Guid.NewGuid(), OrderItemId = order.Items.Last().Id,
                CurrentStatus = ProcurementLifecycleStatus.Delivered,
            });
        await db.SaveChangesAsync();
        var controller = new ProcurementsController(db);

        var activeResult = await controller.GetAll(CancellationToken.None);
        var archiveResult = await controller.GetArchive(CancellationToken.None);
        var active = Assert.IsType<OkObjectResult>(activeResult.Result);
        var archive = Assert.IsType<OkObjectResult>(archiveResult.Result);
        var activeRows = Assert.IsAssignableFrom<IReadOnlyList<ProcurementRowDto>>(active.Value);
        var archivedRows = Assert.IsAssignableFrom<IReadOnlyList<ProcurementRowDto>>(archive.Value);

        Assert.Single(activeRows);
        Assert.Equal(ProcurementLifecycleStatus.AwaitingTransitShipment, activeRows[0].Status);
        Assert.Equal("transit", activeRows[0].Stage);
        Assert.Single(archivedRows);
        Assert.Equal(ProcurementLifecycleStatus.Delivered, archivedRows[0].Status);
        Assert.Equal("archive", archivedRows[0].Stage);
    }

    private static Order CreateOrder(int itemCount)
    {
        var order = new Order
        {
            Id = Guid.NewGuid(),
            TrackingCode = "REQ01",
            CreatedByAdminId = Guid.NewGuid(),
            CreatedAt = DateTimeOffset.UtcNow,
        };

        for (var index = 0; index < itemCount; index++)
        {
            order.Items.Add(new OrderItem
            {
                Id = Guid.NewGuid(),
                OrderId = order.Id,
                Name = $"Item {index + 1}",
                ItemType = OrderItemType.Product,
                SortOrder = index,
                CreatedAt = DateTimeOffset.UtcNow,
            });
        }

        return order;
    }

    private static ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }
}
