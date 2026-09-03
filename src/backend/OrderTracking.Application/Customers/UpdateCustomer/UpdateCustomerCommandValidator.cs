using FluentValidation;

namespace OrderTracking.Application.Customers.UpdateCustomer;

public sealed class UpdateCustomerCommandValidator : AbstractValidator<UpdateCustomerCommand>
{
    public UpdateCustomerCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.LastName).MaximumLength(300);
        RuleFor(x => x.FirstName).MaximumLength(100);
        RuleFor(x => x.Patronymic).MaximumLength(100);
        RuleFor(x => x.Telegram).MaximumLength(100);
        RuleFor(x => x.Phone).MaximumLength(30);
        RuleFor(x => x.WhatsApp).MaximumLength(100);
        RuleFor(x => x.Vk).MaximumLength(200);
        RuleFor(x => x.Email).MaximumLength(256).EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.Email));
        RuleFor(x => x.Notes).MaximumLength(4000);
    }
}
