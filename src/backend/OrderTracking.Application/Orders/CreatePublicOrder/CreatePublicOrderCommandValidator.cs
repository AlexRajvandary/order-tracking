using FluentValidation;

namespace OrderTracking.Application.Orders.CreatePublicOrder;

public sealed class CreatePublicOrderCommandValidator : AbstractValidator<CreatePublicOrderCommand>
{
    public CreatePublicOrderCommandValidator()
    {
        RuleFor(x => x.Name).MaximumLength(100);
        RuleFor(x => x.Phone).MaximumLength(30);
        RuleFor(x => x.Telegram).MaximumLength(100);
        RuleFor(x => x.WhatsApp).MaximumLength(100);
        RuleFor(x => x.Vk).MaximumLength(200);
        RuleFor(x => x.Address).MaximumLength(4000);
        RuleFor(x => x.Items)
            .NotEmpty()
            .Must(items => items.Count <= 100)
            .WithMessage("An order cannot contain more than 100 items")
            .Must(items => items.Select(x => $"{x.Source}:{x.ProductId}:{x.ExternalId}").Distinct().Count() == items.Count)
            .WithMessage("Duplicate products are not allowed");

        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(x => x).Must(x =>
                (x.Source.Equals("Internal", StringComparison.OrdinalIgnoreCase) && x.ProductId is not null)
                || (x.Source.Equals("Rakuten", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(x.ExternalId)))
                .WithMessage("A valid internal or Rakuten product reference is required");
            item.RuleFor(x => x.Quantity).InclusiveBetween(1, 100);
        });
    }
}
