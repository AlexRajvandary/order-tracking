using MediatR;
using Microsoft.Extensions.Configuration;
using Moq;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Orders.CreateOrder;
using OrderTracking.Application.Orders.CreatePublicServiceRequest;
using OrderTracking.Application.Orders.Models;
using OrderTracking.Domain.Entities;
using Xunit;

namespace OrderTracking.Infrastructure.Tests.Orders;

public sealed class CreatePublicServiceRequestTests
{
    [Theory]
    [InlineData("email")]
    [InlineData("")]
    public void Validator_RejectsUnsupportedContactType(string contactType)
    {
        var command = CreateIndividualCommand(contactType, null, "Описание");

        var result = new CreatePublicServiceRequestCommandValidator().Validate(command);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.PropertyName == "ContactType");
    }

    [Fact]
    public void Validator_RequiresDescriptionForIndividualRequest()
    {
        var command = CreateIndividualCommand("telegram", null, "");

        var result = new CreatePublicServiceRequestCommandValidator().Validate(command);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.PropertyName == "Description");
    }

    [Fact]
    public void Validator_RequiresValidLotUrlForAuction()
    {
        var command = new CreatePublicServiceRequestCommand(
            PublicServiceRequestType.Auction,
            "telegram",
            "@buyer",
            "Покупатель",
            "not-a-url",
            null);

        var result = new CreatePublicServiceRequestCommandValidator().Validate(command);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.PropertyName == "SourceUrl");
    }

    [Fact]
    public void Validator_RejectsTooManyImages()
    {
        var images = Enumerable.Range(
                0,
                CreatePublicServiceRequestCommandValidator.MaxImageCount + 1)
            .Select(index => new ServiceRequestImageUpload(
                new MemoryStream([1]),
                $"image-{index}.png",
                "image/png",
                1))
            .ToList();

        try
        {
            var command = CreateIndividualCommand("telegram", null, "Описание") with
            {
                Images = images,
            };

            var result = new CreatePublicServiceRequestCommandValidator().Validate(command);

            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, error => error.PropertyName == "Images");
        }
        finally
        {
            foreach (var image in images)
            {
                image.Content.Dispose();
            }
        }
    }

    [Fact]
    public void Validator_RequiresEventNameAndValidQuantityForTickets()
    {
        var command = new CreatePublicServiceRequestCommand(
            PublicServiceRequestType.Ticket,
            "telegram",
            "@buyer",
            "Покупатель",
            null,
            null,
            EventName: "",
            Quantity: 0);

        var result = new CreatePublicServiceRequestCommandValidator().Validate(command);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.PropertyName == "EventName");
        Assert.Contains(result.Errors, error => error.PropertyName == "Quantity");
    }

    [Fact]
    public async Task Handler_ForwardsAuctionThroughExistingOrderPipeline()
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

        var handler = new CreatePublicServiceRequestCommandHandler(
            admins.Object,
            configuration,
            mediator.Object,
            Mock.Of<IImageCompressor>(),
            Mock.Of<IObjectStorage>());

        await handler.Handle(
            new CreatePublicServiceRequestCommand(
                PublicServiceRequestType.Auction,
                "telegram",
                "@buyer",
                "Покупатель",
                "https://example.com/lot",
                "Сделайте ставку",
                BudgetJpy: 5000),
            CancellationToken.None);

        Assert.NotNull(forwarded);
        Assert.Equal(adminId, forwarded!.CreatedByAdminId);
        Assert.Equal("@buyer", forwarded.NewCustomer?.Telegram);

        var item = Assert.Single(forwarded.Items!);
        Assert.Equal("Аукционный лот", item.Name);
        Assert.Equal("https://example.com/lot", item.SourceUrl);
        Assert.Equal(5000, item.UnitPrice);
        Assert.Equal("JPY", item.CurrencyCode);
    }

    [Fact]
    public async Task Handler_StoresImagesUnderRequestTypeAndOrderId()
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

        var compressor = new Mock<IImageCompressor>();
        compressor
            .Setup(value => value.CompressAsync(
                It.IsAny<Stream>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(() =>
                ((Stream Content, string ContentType, string Extension)?)
                (new MemoryStream([1, 2, 3]), "image/webp", ".webp"));

        string? storedObjectKey = null;
        var storage = new Mock<IObjectStorage>();
        storage
            .Setup(value => value.PutAsync(
                It.IsAny<string>(),
                It.IsAny<Stream>(),
                "image/webp",
                It.IsAny<CancellationToken>()))
            .Callback<string, Stream, string, CancellationToken>(
                (objectKey, _, _, _) => storedObjectKey = objectKey)
            .Returns(Task.CompletedTask);

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["PublicCheckout:CreatedByAdminLogin"] = "checkout",
            })
            .Build();

        var handler = new CreatePublicServiceRequestCommandHandler(
            admins.Object,
            configuration,
            mediator.Object,
            compressor.Object,
            storage.Object);

        await handler.Handle(
            CreateIndividualCommand("telegram", null, "Описание") with
            {
                Images =
                [
                    new ServiceRequestImageUpload(
                        new MemoryStream([1, 2, 3]),
                        "reference.png",
                        "image/png",
                        3),
                ],
            },
            CancellationToken.None);

        Assert.NotNull(forwarded);
        Assert.True(forwarded!.RequestedOrderId.HasValue);
        Assert.StartsWith(
            $"service-requests/individual/{forwarded.RequestedOrderId.Value:D}/images/01-",
            storedObjectKey);

        var notificationImage = Assert.Single(forwarded.NotificationImages!);
        Assert.Equal(storedObjectKey, notificationImage.ObjectKey);
        Assert.Equal("reference.webp", notificationImage.FileName);
    }

    private static CreatePublicServiceRequestCommand CreateIndividualCommand(
        string contactType,
        string? sourceUrl,
        string? description)
    {
        return new CreatePublicServiceRequestCommand(
            PublicServiceRequestType.Individual,
            contactType,
            "@buyer",
            "Покупатель",
            sourceUrl,
            description);
    }
}
