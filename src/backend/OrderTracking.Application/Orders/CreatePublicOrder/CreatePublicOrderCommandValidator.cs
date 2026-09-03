using FluentValidation;

namespace OrderTracking.Application.Orders.CreatePublicOrder;

public sealed class CreatePublicOrderCommandValidator : AbstractValidator<CreatePublicOrderCommand>
{
    public CreatePublicOrderCommandValidator()
    {
        RuleFor(x => x.Name).MaximumLength(100);
        RuleFor(x => x.Phone).MaximumLength(30);
        RuleFor(x => x.WhatsApp).MaximumLength(100);
        RuleFor(x => x.Vk).MaximumLength(200);
        RuleFor(x => x.Address).MaximumLength(4000);
        RuleFor(x => x.Items).NotEmpty();

        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(x => x.ProductId).NotEmpty();
            item.RuleFor(x => x.Quantity).GreaterThan(0);
        });
    }
}
