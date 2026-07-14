using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;

namespace OrderTracking.Application.Orders.DeleteStatusHistoryPhoto;

public sealed class DeleteStatusHistoryPhotoCommandHandler
    : IRequestHandler<DeleteStatusHistoryPhotoCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly IObjectStorage _objectStorage;

    public DeleteStatusHistoryPhotoCommandHandler(
        IApplicationDbContext context,
        IDateTimeProvider dateTimeProvider,
        IObjectStorage objectStorage)
    {
        _context = context;
        _dateTimeProvider = dateTimeProvider;
        _objectStorage = objectStorage;
    }

    public async Task Handle(
        DeleteStatusHistoryPhotoCommand request,
        CancellationToken cancellationToken)
    {
        var attachment = await _context.OrderItemStatusAttachments
            .Include(a => a.StatusHistory)
            .ThenInclude(h => h.OrderItem)
            .FirstOrDefaultAsync(
                a => a.Id == request.AttachmentId
                     && a.StatusHistoryId == request.HistoryId
                     && a.StatusHistory.OrderItem.OrderId == request.OrderId,
                cancellationToken)
            ?? throw new KeyNotFoundException($"Attachment '{request.AttachmentId}' was not found");

        var objectKey = attachment.ObjectKey;

        var order = await _context.Orders
            .FirstAsync(o => o.Id == request.OrderId, cancellationToken);
        order.UpdatedAt = _dateTimeProvider.UtcNow;

        _context.OrderItemStatusAttachments.Remove(attachment);
        await _context.SaveChangesAsync(cancellationToken);

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
