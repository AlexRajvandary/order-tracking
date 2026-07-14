using FluentValidation;
using OrderTracking.Application.Orders.StatusPhotos;

namespace OrderTracking.Application.Orders.UpdateOrderItemStatus;

public sealed class UpdateOrderItemStatusCommandValidator : AbstractValidator<UpdateOrderItemStatusCommand>
{
    public UpdateOrderItemStatusCommandValidator()
    {
        RuleFor(x => x.OrderId).NotEmpty();
        RuleFor(x => x.ItemId).NotEmpty();
        RuleFor(x => x.CustomStatusText).MaximumLength(200);
        RuleFor(x => x.Comment).MaximumLength(4000);

        RuleFor(x => x)
            .Must(x => x.StatusDefinitionId.HasValue ^ !string.IsNullOrWhiteSpace(x.CustomStatusText))
            .WithMessage("Provide either statusDefinitionId or customStatusText, but not both");

        RuleFor(x => x.Photos)
            .Must(photos => photos is null || photos.Count <= StatusPhotoUploadHelper.MaxPhotosPerRequest)
            .WithMessage($"You can upload at most {StatusPhotoUploadHelper.MaxPhotosPerRequest} photos");
    }
}
