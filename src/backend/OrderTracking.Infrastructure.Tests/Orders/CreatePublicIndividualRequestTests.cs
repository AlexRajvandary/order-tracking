using MediatR;
using Microsoft.Extensions.Configuration;
using Moq;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Orders.CreateOrder;
using OrderTracking.Application.Orders.CreatePublicIndividualRequest;
using OrderTracking.Application.Orders.Models;
using OrderTracking.Domain.Entities;
using Xunit;

namespace OrderTracking.Infrastructure.Tests.Orders;

public sealed class CreatePublicIndividualRequestTests
{
    [Theory]
    [InlineData("email")]
    [InlineData("")]
    public void Validator_RejectsUnsupportedContactType(string contactType)
    {
        var command = new CreatePublicIndividualRequestCommand(
            contactType,
            "buyer@example.com",
            "Покупатель",
            null,
            "Ищу редкую фигурку");

        var result = new CreatePublicIndividualRequestCommandValidator().Validate(command);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.PropertyName == "ContactType");
    }

    [Fact]
    public void Validator_RejectsInvalidProductUrlAndEmptyDescription()
    {
        var command = new CreatePublicIndividualRequestCommand(
            "telegram",
            "@buyer",
            "Покупатель",
            "not-a-url",
            "");

        var result = new CreatePublicIndividualRequestCommandValidator().Validate(command);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.PropertyName == "ProductUrl");
        Assert.Contains(result.Errors, error => error.PropertyName == "Description");
    }

    [Fact]
    public async Task Handler_ForwardsRequestThroughExistingOrderPipeline()
    {
        var adminId = Guid.NewGuid();
        var admins = new Mock<IAdminUserRepository>();
        admins
            .Setup(repository => repository.GetByLoginAsync(
                "checkout",
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AdminUser
            {
                Id = adminId,
                Login = "checkout",
                IsActive = true,
            });

        CreateOrderCommand? forwarded = null;
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(value => value.Send(
                It.IsAny<CreateOrderCommand>(),
                It.IsAny<CancellationToken>()))
            .Callback<IRequest<OrderDetailsDto>, CancellationToken>(
                (request, _) => forwarded = (CreateOrderCommand)request)
            .ReturnsAsync((OrderDetailsDto)null!);

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["PublicCheckout:CreatedByAdminLogin"] = "checkout",
            })
            .Build();

        var handler = new CreatePublicIndividualRequestCommandHandler(
            admins.Object,
            configuration,
            mediator.Object);

        await handler.Handle(
            new CreatePublicIndividualRequestCommand(
                "telegram",
                "@buyer",
                "Покупатель",
                "https://example.com/product",
                "Ищу редкую фигурку"),
            CancellationToken.None);

        Assert.NotNull(forwarded);
        Assert.Equal(adminId, forwarded!.CreatedByAdminId);
        Assert.Equal("@buyer", forwarded.NewCustomer?.Telegram);
        Assert.Null(forwarded.NewCustomer?.Phone);

        var item = Assert.Single(forwarded.Items!);
        Assert.Equal("Индивидуальный запрос", item.Name);
        Assert.Equal("Ищу редкую фигурку", item.Description);
        Assert.Equal("https://example.com/product", item.SourceUrl);
        Assert.Null(item.UnitPrice);
    }
}
