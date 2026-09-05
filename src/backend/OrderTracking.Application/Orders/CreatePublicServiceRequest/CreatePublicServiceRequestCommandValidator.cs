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
            .Must(value =>
                value is not null
                && SupportedContactTypes.Contains(value.Trim().ToLowerInvariant()))
            .WithMessage("ContactType must be telegram, phone, whatsapp or vk");

        RuleFor(x => x.Contact)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(x => x.Contact)
            .MaximumLength(30)
            .When(x => string.Equals(
                x.ContactType,
                "phone",
                StringComparison.OrdinalIgnoreCase));

        RuleFor(x => x.CustomerName)
            .NotEmpty()
            .MaximumLength(100);

        RuleFor(x => x.SourceUrl)
            .MaximumLength(2000)
            .Must(BeValidHttpUrl)
            .When(x => !string.IsNullOrWhiteSpace(x.SourceUrl))
            .WithMessage("SourceUrl must be an absolute HTTP or HTTPS URL");

        RuleFor(x => x.Description).MaximumLength(4000);

        RuleFor(x => x.Images)
            .Must(images => images is null || images.Count <= MaxImageCount)
            .WithMessage($"You can upload at most {MaxImageCount} images");

        RuleForEach(x => x.Images)
            .Must(image => image.Length > 0 && image.Length <= MaxImageBytes)
            .WithMessage($"Each image must be no larger than {MaxImageBytes / 1024 / 1024} MB");

        When(x => x.RequestType == PublicServiceRequestType.Individual, () =>
        {
            RuleFor(x => x.Description).NotEmpty();
        });

        When(x => x.RequestType == PublicServiceRequestType.Auction, () =>
        {
            RuleFor(x => x.SourceUrl).NotEmpty();
            RuleFor(x => x.BudgetJpy)
                .GreaterThan(0)
                .When(x => x.BudgetJpy.HasValue);
        });

        When(x => x.RequestType == PublicServiceRequestType.Ticket, () =>
        {
            RuleFor(x => x.EventName).NotEmpty().MaximumLength(500);
            RuleFor(x => x.EventDate)
                .Must(value => DateOnly.TryParse(value, out _))
                .When(x => !string.IsNullOrWhiteSpace(x.EventDate))
                .WithMessage("EventDate must be a valid date");
            RuleFor(x => x.Location).MaximumLength(500);
            RuleFor(x => x.Quantity).InclusiveBetween(1, 100);
            RuleFor(x => x.BudgetJpy)
                .GreaterThan(0)
                .When(x => x.BudgetJpy.HasValue);
        });
    }

    private static bool BeValidHttpUrl(string? value)
    {
        return Uri.TryCreate(value, UriKind.Absolute, out var uri)
            && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
    }
}
