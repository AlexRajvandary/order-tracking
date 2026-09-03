using MediatR;
using Microsoft.Extensions.Configuration;
using Moq;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Orders.CreateOrder;
using OrderTracking.Application.Orders.CreatePublicOrder;
using OrderTracking.Application.Orders.Models;
using OrderTracking.Domain.Entities;
using Xunit;

namespace OrderTracking.Infrastructure.Tests.Orders;

public sealed class CreatePublicOrderTests
{
    [Fact]
    public void Validator_RejectsDuplicateProductsAndInvalidQuantity()
    {
        var productId = Guid.NewGuid();
        var command = new CreatePublicOrderCommand(
            null,
            null,
            null,
            null,
            null,
            [new(productId, 0), new(productId, 1)]);

        var result = new CreatePublicOrderCommandValidator().Validate(command);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.ErrorMessage.Contains("Duplicate product IDs"));
        Assert.Contains(result.Errors, error => error.PropertyName.EndsWith("Quantity"));
    }

    [Fact]
    public async Task Handler_UsesTrustedRussianNamePriceAndSourceUrlFromProductApi()
    {
        var productId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var productClient = new Mock<IProductCatalogClient>();
        productClient
            .Setup(client => client.GetByIdAsync(productId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CatalogProductSnapshot(
                productId,
                "日本語の商品名",
                "Русское название",
                "Описание",
                "https://shop.example/product/1",
                1500m,
                "RUB",
                true));

        var admins = new Mock<IAdminUserRepository>();
        admins
            .Setup(repository => repository.GetByLoginAsync("checkout", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AdminUser { Id = adminId, Login = "checkout", IsActive = true });

        CreateOrderCommand? forwarded = null;
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(value => value.Send(It.IsAny<CreateOrderCommand>(), It.IsAny<CancellationToken>()))
            .Callback<IRequest<OrderDetailsDto>, CancellationToken>((request, _) => forwarded = (CreateOrderCommand)request)
            .ReturnsAsync((OrderDetailsDto)null!);

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["PublicCheckout:CreatedByAdminLogin"] = "checkout",
            })
            .Build();

        var handler = new CreatePublicOrderCommandHandler(
            productClient.Object,
            admins.Object,
            configuration,
            mediator.Object);

        await handler.Handle(
            new CreatePublicOrderCommand(
                "Иван",
                "+79990000000",
                null,
                null,
                null,
                [new PublicOrderItemDto(productId, 2)]),
            CancellationToken.None);

        Assert.NotNull(forwarded);
        var item = Assert.Single(forwarded!.Items!);
        Assert.Equal("Русское название", item.Name);
        Assert.Equal(1500m, item.UnitPrice);
        Assert.Equal("https://shop.example/product/1", item.SourceUrl);
        Assert.Equal(adminId, forwarded.CreatedByAdminId);
    }
}
