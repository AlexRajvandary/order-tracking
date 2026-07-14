using FluentValidation;

namespace OrderTracking.Application.Orders.RestoreOrder;

public sealed class RestoreOrderCommandValidator : AbstractValidator<RestoreOrderCommand>
{
    public RestoreOrderCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
    }
}
