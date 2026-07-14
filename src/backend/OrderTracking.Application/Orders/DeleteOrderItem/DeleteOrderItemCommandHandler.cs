using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;

namespace OrderTracking.Application.Orders.DeleteOrderItem;

public sealed class DeleteOrderItemCommandHandler : IRequestHandler<DeleteOrderItemCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeProvider _dateTimeProvider;

    public DeleteOrderItemCommandHandler(
        IApplicationDbContext context,
        IDateTimeProvider dateTimeProvider)
    {
        _context = context;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task Handle(DeleteOrderItemCommand request, CancellationToken cancellationToken)
    {
        var order = await _context.Orders
            .FirstOrDefaultAsync(o => o.Id == request.OrderId, cancellationToken)
            ?? throw new KeyNotFoundException($"Order '{request.OrderId}' was not found");

        var item = await _context.OrderItems
            .FirstOrDefaultAsync(
                i => i.Id == request.ItemId && i.OrderId == request.OrderId,
                cancellationToken)
            ?? throw new KeyNotFoundException($"Order item '{request.ItemId}' was not found");

        order.UpdatedAt = _dateTimeProvider.UtcNow;
        _context.OrderItems.Remove(item);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
