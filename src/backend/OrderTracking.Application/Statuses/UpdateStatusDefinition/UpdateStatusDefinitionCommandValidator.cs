using FluentValidation;

namespace OrderTracking.Application.Statuses.UpdateStatusDefinition;

public sealed class UpdateStatusDefinitionCommandValidator : AbstractValidator<UpdateStatusDefinitionCommand>
{
    public UpdateStatusDefinitionCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Color).MaximumLength(20);
        RuleFor(x => x.SortOrder).GreaterThanOrEqualTo(0);
        RuleFor(x => x.ItemType).IsInEnum().When(x => x.ItemType.HasValue);
    }
}
