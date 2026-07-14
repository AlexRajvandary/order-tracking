using FluentValidation;

namespace OrderTracking.Application.Customers.SearchCustomers;

public sealed class SearchCustomersQueryValidator : AbstractValidator<SearchCustomersQuery>
{
    public SearchCustomersQueryValidator()
    {
        RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 100);

        When(x => !string.IsNullOrWhiteSpace(x.Q), () =>
        {
            RuleFor(x => x.Q).MinimumLength(2).MaximumLength(300);
        });

        When(x => !string.IsNullOrWhiteSpace(x.Phone), () =>
        {
            RuleFor(x => x.Phone).MinimumLength(2).MaximumLength(30);
        });

        RuleFor(x => x)
            .Must(x => !string.IsNullOrWhiteSpace(x.Q) || !string.IsNullOrWhiteSpace(x.Phone))
            .WithMessage("Search query or phone is required");
    }
}
