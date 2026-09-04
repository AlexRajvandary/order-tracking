using FluentValidation;

namespace OrderTracking.Application.Orders.CreatePublicIndividualRequest;

public sealed class CreatePublicIndividualRequestCommandValidator
    : AbstractValidator<CreatePublicIndividualRequestCommand>
{
    private static readonly string[] SupportedContactTypes =
    [
        "telegram",
        "phone",
        "whatsapp",
        "vk",
    ];

    public CreatePublicIndividualRequestCommandValidator()
    {
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

        RuleFor(x => x.ProductUrl)
            .MaximumLength(2000)
            .Must(BeValidHttpUrl)
            .When(x => !string.IsNullOrWhiteSpace(x.ProductUrl))
            .WithMessage("ProductUrl must be an absolute HTTP or HTTPS URL");

        RuleFor(x => x.Description)
            .NotEmpty()
            .MaximumLength(4000);
    }

    private static bool BeValidHttpUrl(string? value)
    {
        return Uri.TryCreate(value, UriKind.Absolute, out var uri)
            && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
    }
}
