using FluentValidation;
using OrderTracking.Application.Orders.Models;
using OrderTracking.Domain.Common;

namespace OrderTracking.Application.Orders.CreateOrder;

public sealed class CreateOrderCommandValidator : AbstractValidator<CreateOrderCommand>
{
    public CreateOrderCommandValidator()
    {
        RuleFor(x => x.AdminNotes).MaximumLength(4000);

        RuleFor(x => x)
            .Must(x => x.CustomerId is null || !HasAnyNewCustomerField(x.NewCustomer))
            .WithMessage("Provide either an existing customerId or newCustomer details, not both");

        RuleFor(x => x)
            .Must(x => x.DeliveryAddressId is null || !HasAnyDeliveryField(x.DeliveryAddress))
            .WithMessage("Provide either deliveryAddressId or deliveryAddress fields, not both");

        When(x => x.NewCustomer is not null, () =>
        {
            RuleFor(x => x.NewCustomer!.LastName).MaximumLength(300);
            RuleFor(x => x.NewCustomer!.FirstName).MaximumLength(100);
            RuleFor(x => x.NewCustomer!.Patronymic).MaximumLength(100);
            RuleFor(x => x.NewCustomer!.Telegram).MaximumLength(100);
            RuleFor(x => x.NewCustomer!.Phone).MaximumLength(30);
            RuleFor(x => x.NewCustomer!.Email)
                .MaximumLength(256)
                .EmailAddress()
                .When(x => !string.IsNullOrWhiteSpace(x.NewCustomer!.Email));
        });

        When(x => x.DeliveryAddress is not null, () =>
        {
            RuleFor(x => x.DeliveryAddress!.City).MaximumLength(200);
            RuleFor(x => x.DeliveryAddress!.Street).MaximumLength(300);
            RuleFor(x => x.DeliveryAddress!.Building).MaximumLength(50);
            RuleFor(x => x.DeliveryAddress!.Apartment).MaximumLength(50);
            RuleFor(x => x.DeliveryAddress!.PostalCode).MaximumLength(20);
            RuleFor(x => x.DeliveryAddress!.Note).MaximumLength(4000);
        });

        RuleForEach(x => x.Items!).ChildRules(item =>
        {
            item.RuleFor(i => i.Name).NotEmpty().MaximumLength(500);
            item.RuleFor(i => i.Description).MaximumLength(4000);
            item.RuleFor(i => i.Quantity).GreaterThanOrEqualTo(1).LessThanOrEqualTo(10_000);
            item.RuleFor(i => i.UnitPrice).GreaterThanOrEqualTo(0).When(i => i.UnitPrice.HasValue);
            item.RuleFor(i => i.CurrencyCode)
                .Must((input, currency) =>
                    input.UnitPrice.HasValue
                        ? CurrencyCodes.IsSupported(currency)
                        : string.IsNullOrWhiteSpace(currency))
                .WithMessage("CurrencyCode must be RUB, USD, EUR, GBP or JPY when UnitPrice is set");
            item.RuleFor(i => i.ItemType).IsInEnum();
        }).When(x => x.Items is { Count: > 0 });
    }

    private static bool HasAnyNewCustomerField(CreateOrderNewCustomerDto? customer) =>
        customer is not null
        && (
            !string.IsNullOrWhiteSpace(customer.LastName)
            || !string.IsNullOrWhiteSpace(customer.FirstName)
            || !string.IsNullOrWhiteSpace(customer.Patronymic)
            || !string.IsNullOrWhiteSpace(customer.Telegram)
            || !string.IsNullOrWhiteSpace(customer.Phone)
            || !string.IsNullOrWhiteSpace(customer.Email));

    private static bool HasAnyDeliveryField(CreateOrderDeliveryAddressDto? address) =>
        address is not null
        && (
            !string.IsNullOrWhiteSpace(address.City)
            || !string.IsNullOrWhiteSpace(address.Street)
            || !string.IsNullOrWhiteSpace(address.Building)
            || !string.IsNullOrWhiteSpace(address.Apartment)
            || !string.IsNullOrWhiteSpace(address.PostalCode)
            || !string.IsNullOrWhiteSpace(address.Note));
}
