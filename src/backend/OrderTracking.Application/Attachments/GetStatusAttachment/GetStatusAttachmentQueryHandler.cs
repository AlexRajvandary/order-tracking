using MediatR;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Persistence;

namespace OrderTracking.Application.Attachments.GetStatusAttachment;

public sealed class GetStatusAttachmentQueryHandler
    : IRequestHandler<GetStatusAttachmentQuery, StatusAttachmentFile>
{
    private readonly IOrderRepository _orderRepository;
    private readonly IObjectStorage _objectStorage;

    public GetStatusAttachmentQueryHandler(
        IOrderRepository orderRepository,
        IObjectStorage objectStorage)
    {
        _orderRepository = orderRepository;
        _objectStorage = objectStorage;
    }

    public async Task<StatusAttachmentFile> Handle(
        GetStatusAttachmentQuery request,
        CancellationToken cancellationToken)
    {
        var attachment = await _orderRepository.GetAttachmentByIdAsync(request.Id, cancellationToken)
            ?? throw new KeyNotFoundException($"Attachment '{request.Id}' was not found");

        var stream = await _objectStorage.GetAsync(attachment.ObjectKey, cancellationToken);
        return new StatusAttachmentFile(stream, attachment.ContentType, attachment.OriginalFileName);
    }
}
