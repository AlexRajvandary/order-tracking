using FluentValidation.TestHelper;
using OrderTracking.Application.Orders.AiParse;
using Xunit;

namespace OrderTracking.Infrastructure.Tests.Orders;

public sealed class ParseOrderWithAiCommandValidatorTests
{
    private readonly ParseOrderWithAiCommandValidator _validator = new();

    [Fact]
    public void Validate_WhenTextProvided_Passes()
    {
        var result = _validator.TestValidate(new ParseOrderWithAiCommand(
            "Иван +79991234567 Sony",
            null,
            null,
            null,
            null));

        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Validate_WhenNoTextAndNoImage_Fails()
    {
        var result = _validator.TestValidate(new ParseOrderWithAiCommand(
            null,
            null,
            null,
            null,
            null));

        result.ShouldHaveValidationErrorFor(x => x);
    }

    [Fact]
    public void Validate_WhenUnsupportedImageType_Fails()
    {
        using var stream = new MemoryStream([1, 2, 3]);
        var result = _validator.TestValidate(new ParseOrderWithAiCommand(
            null,
            stream,
            "image/gif",
            "shot.gif",
            stream.Length));

        result.ShouldHaveValidationErrorFor(x => x.ImageContentType);
    }

    [Fact]
    public void Validate_WhenImageTooLarge_Fails()
    {
        using var stream = new MemoryStream([1]);
        var result = _validator.TestValidate(new ParseOrderWithAiCommand(
            "text",
            stream,
            "image/png",
            "big.png",
            AiOrderParseLimits.MaxImageBytes + 1));

        result.ShouldHaveValidationErrorFor(x => x.ImageLength);
    }

    [Fact]
    public void Validate_WhenJpegImage_Passes()
    {
        using var stream = new MemoryStream([1, 2, 3]);
        var result = _validator.TestValidate(new ParseOrderWithAiCommand(
            null,
            stream,
            "image/jpeg",
            "shot.jpg",
            stream.Length));

        result.ShouldNotHaveAnyValidationErrors();
    }
}
