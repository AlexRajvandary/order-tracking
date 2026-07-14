using FluentValidation;

namespace OrderTracking.Application.Tracking.GetOrderByTrackingCode;

public sealed class GetOrderByTrackingCodeQueryValidator : AbstractValidator<GetOrderByTrackingCodeQuery>
{
    public GetOrderByTrackingCodeQueryValidator()
    {
        RuleFor(x => x.TrackingCode)
            .NotEmpty()
            .Length(5)
            .Matches("^[A-Z0-9]+$")
            .WithMessage("Tracking code must be 5 uppercase alphanumeric characters");
    }
}
