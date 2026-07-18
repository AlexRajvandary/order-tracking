using MediatR;
using OrderTracking.Application.Orders.Models;
using OrderTracking.Application.Orders.StatusPhotos;

namespace OrderTracking.Application.Orders.UpdateOrderItemStatus;

public sealed record UpdateOrderItemStatusCommand(
    Guid OrderId,
    Guid ItemId,
    Guid? StatusDefinitionId,
    string? CustomStatusText,
    string? Comment,
    string? Country,
    string? Location,
    DateTimeOffset? PublishAt,
    IReadOnlyList<StatusPhotoUploadFile>? Photos) : IRequest<OrderItemDto>;
