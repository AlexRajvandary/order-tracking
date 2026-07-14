using FluentValidation;

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
    }
}
