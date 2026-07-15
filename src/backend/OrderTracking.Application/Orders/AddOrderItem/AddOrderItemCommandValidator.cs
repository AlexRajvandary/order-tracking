using FluentValidation;
using OrderTracking.Domain.Common;

namespace OrderTracking.Application.Orders.AddOrderItem;

public sealed class AddOrderItemCommandValidator : AbstractValidator<AddOrderItemCommand>
{
    public AddOrderItemCommandValidator()
    {
        RuleFor(x => x.OrderId).NotEmpty();
        RuleFor(x => x.ItemType).IsInEnum();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(500);
        RuleFor(x => x.Description).MaximumLength(4000);
        RuleFor(x => x.Quantity).GreaterThanOrEqualTo(1).LessThanOrEqualTo(10_000);
        RuleFor(x => x.UnitPrice).GreaterThanOrEqualTo(0).When(x => x.UnitPrice.HasValue);
        RuleFor(x => x.CurrencyCode)
            .Must((command, currency) =>
                command.UnitPrice.HasValue
                    ? CurrencyCodes.IsSupported(currency)
                    : string.IsNullOrWhiteSpace(currency))
            .WithMessage("CurrencyCode must be RUB, USD, EUR, GBP or JPY when UnitPrice is set");
    }
}
