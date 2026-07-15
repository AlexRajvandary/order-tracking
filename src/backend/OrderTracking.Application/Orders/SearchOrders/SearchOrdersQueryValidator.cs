using FluentValidation;

namespace OrderTracking.Application.Orders.SearchOrders;

public sealed class SearchOrdersQueryValidator : AbstractValidator<SearchOrdersQuery>
{
    public SearchOrdersQueryValidator()
    {
        RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 500);

        When(x => !string.IsNullOrWhiteSpace(x.Q), () =>
            RuleFor(x => x.Q!).MinimumLength(2).MaximumLength(300));

        When(x => !string.IsNullOrWhiteSpace(x.TrackingCode), () =>
            RuleFor(x => x.TrackingCode!).Length(1, 5));

        When(x => !string.IsNullOrWhiteSpace(x.CustomerName), () =>
            RuleFor(x => x.CustomerName!).MinimumLength(2).MaximumLength(300));

        When(x => !string.IsNullOrWhiteSpace(x.Phone), () =>
            RuleFor(x => x.Phone!).MinimumLength(2).MaximumLength(30));

        RuleFor(x => x)
            .Must(x =>
                !string.IsNullOrWhiteSpace(x.Q)
                || !string.IsNullOrWhiteSpace(x.TrackingCode)
                || !string.IsNullOrWhiteSpace(x.CustomerName)
                || !string.IsNullOrWhiteSpace(x.Phone))
            .WithMessage("At least one search criterion is required");
    }
}
