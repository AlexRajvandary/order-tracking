using FluentValidation;

namespace OrderTracking.Application.Statuses.CreateStatusDefinition;

public sealed class CreateStatusDefinitionCommandValidator : AbstractValidator<CreateStatusDefinitionCommand>
{
    public CreateStatusDefinitionCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Color).MaximumLength(20);
        RuleFor(x => x.SortOrder).GreaterThanOrEqualTo(0);
        RuleFor(x => x.ItemType).IsInEnum().When(x => x.ItemType.HasValue);
    }
}
