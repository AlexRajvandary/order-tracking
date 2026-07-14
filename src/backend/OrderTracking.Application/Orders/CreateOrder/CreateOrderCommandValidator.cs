using FluentValidation;

namespace OrderTracking.Application.Orders.CreateOrder;

public sealed class CreateOrderCommandValidator : AbstractValidator<CreateOrderCommand>
{
    public CreateOrderCommandValidator()
    {
        RuleFor(x => x.AdminNotes).MaximumLength(4000);

        RuleFor(x => x)
            .Must(x => x.CustomerId is null || !HasAnyNewCustomerField(x.NewCustomer))
            .WithMessage("Provide either an existing customerId or newCustomer details, not both");

        When(x => x.NewCustomer is not null, () =>
        {
            RuleFor(x => x.NewCustomer!.FullName).MaximumLength(300);
            RuleFor(x => x.NewCustomer!.Telegram).MaximumLength(100);
            RuleFor(x => x.NewCustomer!.Phone).MaximumLength(30);
            RuleFor(x => x.NewCustomer!.Email)
                .MaximumLength(256)
                .EmailAddress()
                .When(x => !string.IsNullOrWhiteSpace(x.NewCustomer!.Email));
        });

        RuleForEach(x => x.Items!).ChildRules(item =>
        {
            item.RuleFor(i => i.Name).NotEmpty().MaximumLength(500);
            item.RuleFor(i => i.Description).MaximumLength(4000);
            item.RuleFor(i => i.Quantity).GreaterThanOrEqualTo(1).LessThanOrEqualTo(10_000);
            item.RuleFor(i => i.ItemType).IsInEnum();
        }).When(x => x.Items is { Count: > 0 });
    }

    private static bool HasAnyNewCustomerField(CreateOrderNewCustomerDto? customer) =>
        customer is not null
        && (
            !string.IsNullOrWhiteSpace(customer.FullName)
            || !string.IsNullOrWhiteSpace(customer.Telegram)
            || !string.IsNullOrWhiteSpace(customer.Phone)
            || !string.IsNullOrWhiteSpace(customer.Email));
}
