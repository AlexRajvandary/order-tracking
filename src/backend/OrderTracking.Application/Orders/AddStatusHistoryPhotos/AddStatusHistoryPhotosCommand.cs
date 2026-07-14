using MediatR;
using OrderTracking.Application.Statuses.Models;
using OrderTracking.Application.Orders.StatusPhotos;

namespace OrderTracking.Application.Orders.AddStatusHistoryPhotos;

public sealed record AddStatusHistoryPhotosCommand(
    Guid OrderId,
    Guid HistoryId,
    IReadOnlyList<StatusPhotoUploadFile> Photos)
    : IRequest<IReadOnlyList<StatusHistoryAttachmentDto>>;
