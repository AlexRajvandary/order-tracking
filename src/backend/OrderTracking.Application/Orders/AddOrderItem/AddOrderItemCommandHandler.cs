using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Orders.Models;
using OrderTracking.Domain.Entities;

namespace OrderTracking.Application.Orders.AddOrderItem;

public sealed class AddOrderItemCommandHandler : IRequestHandler<AddOrderItemCommand, OrderItemDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeProvider _dateTimeProvider;

    public AddOrderItemCommandHandler(
        IApplicationDbContext context,
        IDateTimeProvider dateTimeProvider)
    {
        _context = context;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task<OrderItemDto> Handle(AddOrderItemCommand request, CancellationToken cancellationToken)
    {
        var order = await _context.Orders
            .FirstOrDefaultAsync(o => o.Id == request.OrderId, cancellationToken)
            ?? throw new KeyNotFoundException($"Order '{request.OrderId}' was not found");

        var maxSort = await _context.OrderItems
            .Where(i => i.OrderId == request.OrderId)
            .Select(i => (int?)i.SortOrder)
            .MaxAsync(cancellationToken) ?? -1;

        var now = _dateTimeProvider.UtcNow;
        var item = new OrderItem
        {
            Id = Guid.NewGuid(),
            OrderId = order.Id,
            ItemType = request.ItemType,
            Name = request.Name.Trim(),
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            Quantity = request.Quantity <= 0 ? 1 : request.Quantity,
            SortOrder = maxSort + 1,
            CreatedAt = now,
        };

        order.UpdatedAt = now;
        _context.OrderItems.Add(item);
        await _context.SaveChangesAsync(cancellationToken);

        return Map(item);
    }

    internal static OrderItemDto Map(OrderItem item) =>
        new(
            item.Id,
            item.ItemType.ToString(),
            item.Name,
            item.Description,
            item.Quantity,
            item.SortOrder,
            item.CurrentStatusId,
            item.CurrentStatusText,
            item.CurrentStatusUpdatedAt);
}
