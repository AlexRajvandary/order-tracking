using FluentValidation;

namespace OrderTracking.Application.Orders.AiParse;

public sealed class ParseOrderWithAiCommandValidator : AbstractValidator<ParseOrderWithAiCommand>
{
    public ParseOrderWithAiCommandValidator()
    {
        RuleFor(x => x)
            .Must(x => !string.IsNullOrWhiteSpace(x.Text) || x.Image is not null)
            .WithMessage("Provide text and/or an image to parse");

        RuleFor(x => x.Text)
            .MaximumLength(20_000)
            .When(x => x.Text is not null);

        When(x => x.Image is not null, () =>
        {
            RuleFor(x => x.ImageContentType)
                .Must(AiOrderParseLimits.IsAllowedImageContentType)
                .WithMessage("Unsupported image type. Allowed: image/png, image/jpeg, image/webp");

            RuleFor(x => x.ImageLength)
                .Must(length => length is null || length <= AiOrderParseLimits.MaxImageBytes)
                .WithMessage($"Image exceeds maximum size of {AiOrderParseLimits.MaxImageBytes / (1024 * 1024)} MB");

            RuleFor(x => x.ImageLength)
                .Must(length => length is null || length > 0)
                .WithMessage("Image file is empty");
        });
    }
}
