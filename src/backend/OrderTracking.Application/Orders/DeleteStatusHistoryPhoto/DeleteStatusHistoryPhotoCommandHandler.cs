using MediatR;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Persistence;

namespace OrderTracking.Application.Orders.DeleteStatusHistoryPhoto;

public sealed class DeleteStatusHistoryPhotoCommandHandler
    : IRequestHandler<DeleteStatusHistoryPhotoCommand>
{
    private readonly IOrderRepository _orderRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly IObjectStorage _objectStorage;

    public DeleteStatusHistoryPhotoCommandHandler(
        IOrderRepository orderRepository,
        IUnitOfWork unitOfWork,
        IDateTimeProvider dateTimeProvider,
        IObjectStorage objectStorage)
    {
        _orderRepository = orderRepository;
        _unitOfWork = unitOfWork;
        _dateTimeProvider = dateTimeProvider;
        _objectStorage = objectStorage;
    }

    public async Task Handle(
        DeleteStatusHistoryPhotoCommand request,
        CancellationToken cancellationToken)
    {
        var attachment = await _orderRepository.GetAttachmentForOrderHistoryAsync(
                request.OrderId, request.HistoryId, request.AttachmentId, cancellationToken)
            ?? throw new KeyNotFoundException($"Attachment '{request.AttachmentId}' was not found");

        var objectKey = attachment.ObjectKey;

        var order = await _orderRepository.GetByIdTrackedAsync(request.OrderId, cancellationToken)
            ?? throw new KeyNotFoundException($"Order '{request.OrderId}' was not found");
        order.UpdatedAt = _dateTimeProvider.UtcNow;

        _orderRepository.RemoveAttachment(attachment);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        try
        {
            await _objectStorage.DeleteAsync(objectKey, cancellationToken);
        }
        catch
        {
            // DB row already removed; orphan object is preferable to blocking the request
        }
    }
}
