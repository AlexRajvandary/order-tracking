using FluentValidation;
using OrderTracking.Application.Orders.StatusPhotos;

namespace OrderTracking.Application.Orders.AddStatusHistoryPhotos;

public sealed class AddStatusHistoryPhotosCommandValidator
    : AbstractValidator<AddStatusHistoryPhotosCommand>
{
    public AddStatusHistoryPhotosCommandValidator()
    {
        RuleFor(x => x.OrderId).NotEmpty();
        RuleFor(x => x.HistoryId).NotEmpty();
        RuleFor(x => x.Photos)
            .NotEmpty()
            .Must(p => p.Count <= StatusPhotoUploadHelper.MaxPhotosPerRequest)
            .WithMessage($"You can upload at most {StatusPhotoUploadHelper.MaxPhotosPerRequest} photos");
    }
}
