using FluentValidation;

namespace OrderTracking.Application.Orders.UpdateOrderItemStatusHistory;

public sealed class UpdateOrderItemStatusHistoryCommandValidator
    : AbstractValidator<UpdateOrderItemStatusHistoryCommand>
{
    public UpdateOrderItemStatusHistoryCommandValidator()
    {
        RuleFor(x => x.OrderId).NotEmpty();
        RuleFor(x => x.HistoryId).NotEmpty();
        RuleFor(x => x.StatusText).MaximumLength(200);
        RuleFor(x => x.Comment).MaximumLength(4000);
        RuleFor(x => x.Country).MaximumLength(100);
        RuleFor(x => x.Location).MaximumLength(500);
    }
}
