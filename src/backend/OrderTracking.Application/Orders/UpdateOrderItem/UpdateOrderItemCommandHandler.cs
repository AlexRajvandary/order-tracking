using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Orders.AddOrderItem;
using OrderTracking.Application.Orders.Models;

namespace OrderTracking.Application.Orders.UpdateOrderItem;

public sealed class UpdateOrderItemCommandHandler : IRequestHandler<UpdateOrderItemCommand, OrderItemDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeProvider _dateTimeProvider;

    public UpdateOrderItemCommandHandler(
        IApplicationDbContext context,
        IDateTimeProvider dateTimeProvider)
    {
        _context = context;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task<OrderItemDto> Handle(UpdateOrderItemCommand request, CancellationToken cancellationToken)
    {
        var order = await _context.Orders
            .FirstOrDefaultAsync(o => o.Id == request.OrderId, cancellationToken)
            ?? throw new KeyNotFoundException($"Order '{request.OrderId}' was not found");

        var item = await _context.OrderItems
            .FirstOrDefaultAsync(
                i => i.Id == request.ItemId && i.OrderId == request.OrderId,
                cancellationToken)
            ?? throw new KeyNotFoundException($"Order item '{request.ItemId}' was not found");

        item.ItemType = request.ItemType;
        item.Name = request.Name.Trim();
        item.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        item.Quantity = request.Quantity <= 0 ? 1 : request.Quantity;
        order.UpdatedAt = _dateTimeProvider.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return AddOrderItemCommandHandler.Map(item);
    }
}
