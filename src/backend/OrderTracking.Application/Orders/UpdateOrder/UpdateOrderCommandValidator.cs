using FluentValidation;

namespace OrderTracking.Application.Orders.UpdateOrder;

public sealed class UpdateOrderCommandValidator : AbstractValidator<UpdateOrderCommand>
{
    public UpdateOrderCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.AdminNotes).MaximumLength(4000);
    }
}
