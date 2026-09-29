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
