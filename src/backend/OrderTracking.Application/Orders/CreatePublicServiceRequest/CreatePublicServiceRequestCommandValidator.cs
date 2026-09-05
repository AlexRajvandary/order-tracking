using FluentValidation;

namespace OrderTracking.Application.Orders.CreatePublicServiceRequest;

public sealed class CreatePublicServiceRequestCommandValidator
    : AbstractValidator<CreatePublicServiceRequestCommand>
{
    public const int MaxImageCount = 5;

    public const long MaxImageBytes = 10 * 1024 * 1024;

    private static readonly string[] SupportedContactTypes =
    [
        "telegram",
        "phone",
        "whatsapp",
        "vk",
    ];

    public CreatePublicServiceRequestCommandValidator()
    {
        RuleFor(x => x.RequestType).IsInEnum();

        RuleFor(x => x.ContactType)
            .NotEmpty()
            .MaximumLength(50)
            .Must(value =>
                value is not null
                && SupportedContactTypes.Contains(value.Trim().ToLowerInvariant()))
            .WithMessage("ContactType must be telegram, phone, whatsapp or vk");

        RuleFor(x => x.Contact)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(x => x.CustomerName)
            .MaximumLength(100);

        RuleFor(x => x.SourceUrl)
            .MaximumLength(2000);

        RuleFor(x => x.Description).MaximumLength(4000);

        RuleFor(x => x.EventName).MaximumLength(500);

        RuleFor(x => x.EventDate).MaximumLength(100);

        RuleFor(x => x.Location).MaximumLength(500);

        RuleFor(x => x.Images)
            .Must(images => images is null || images.Count <= MaxImageCount)
            .WithMessage($"You can upload at most {MaxImageCount} images");

        RuleForEach(x => x.Images)
            .Must(image => image.Length > 0 && image.Length <= MaxImageBytes)
            .WithMessage($"Each image must be no larger than {MaxImageBytes / 1024 / 1024} MB");

    }
}
