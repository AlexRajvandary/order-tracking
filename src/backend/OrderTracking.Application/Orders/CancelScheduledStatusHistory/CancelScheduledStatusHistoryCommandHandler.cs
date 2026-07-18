using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Orders.StatusHistory;

namespace OrderTracking.Application.Orders.CancelScheduledStatusHistory;

public sealed class CancelScheduledStatusHistoryCommandHandler
    : IRequestHandler<CancelScheduledStatusHistoryCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeProvider _dateTimeProvider;

    public CancelScheduledStatusHistoryCommandHandler(
        IApplicationDbContext context,
        IDateTimeProvider dateTimeProvider)
    {
        _context = context;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task Handle(
        CancelScheduledStatusHistoryCommand request,
        CancellationToken cancellationToken)
    {
        var history = await _context.OrderItemStatusHistories
            .Include(h => h.OrderItem)
            .FirstOrDefaultAsync(
                h => h.Id == request.HistoryId && h.OrderItem.OrderId == request.OrderId,
                cancellationToken)
            ?? throw new KeyNotFoundException($"Status history '{request.HistoryId}' was not found");

        if (history.IsPublished)
        {
            throw new InvalidOperationException(
                "Only scheduled (unpublished) status history entries can be cancelled");
        }

        var order = await _context.Orders
            .FirstAsync(o => o.Id == request.OrderId, cancellationToken);
        order.UpdatedAt = _dateTimeProvider.UtcNow;

        _context.OrderItemStatusHistories.Remove(history);

        await OrderItemCurrentStatusSync.SyncFromPublishedHistoryAsync(
            _context,
            history.OrderItem,
            cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);
    }
}
