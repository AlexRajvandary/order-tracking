using Moq;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Orders.AiParse;
using Xunit;

namespace OrderTracking.Infrastructure.Tests.Orders;

public sealed class ParseOrderWithAiCommandHandlerTests
{
    [Fact]
    public async Task Handle_PassesTextToParser()
    {
        var parser = new Mock<IAiOrderParser>(MockBehavior.Strict);
        parser
            .Setup(p => p.ParseAsync("hello", null, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AiOrderDraft(
                null,
                [],
                null,
                null,
                null,
                ["customer.phone"],
                []));

        var handler = new ParseOrderWithAiCommandHandler(parser.Object);
        var result = await handler.Handle(
            new ParseOrderWithAiCommand("hello", null, null, null, null),
            CancellationToken.None);

        Assert.Single(result.MissingFields);
        Assert.Equal("customer.phone", result.MissingFields[0]);
        parser.VerifyAll();
    }

    [Fact]
    public async Task Handle_CopiesImageStreamBeforeParsing()
    {
        var sourceBytes = new byte[] { 10, 20, 30 };
        await using var source = new MemoryStream(sourceBytes);

        var parser = new Mock<IAiOrderParser>(MockBehavior.Strict);
        parser
            .Setup(p => p.ParseAsync(
                null,
                It.IsAny<Stream>(),
                "image/png",
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((string? _, Stream? image, string? _, CancellationToken _) =>
            {
                Assert.NotNull(image);
                Assert.True(image!.CanSeek);
                using var ms = new MemoryStream();
                image.CopyTo(ms);
                Assert.Equal(sourceBytes, ms.ToArray());
                return new AiOrderDraft(null, [], null, null, null, [], []);
            });

        var handler = new ParseOrderWithAiCommandHandler(parser.Object);
        await handler.Handle(
            new ParseOrderWithAiCommand(null, source, "image/png", "a.png", sourceBytes.Length),
            CancellationToken.None);

        parser.VerifyAll();
    }
}
