using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Orders.Models;
using OrderTracking.Application.Orders.StatusHistory;
using OrderTracking.Domain.Common;
using OrderTracking.Domain.Entities;

namespace OrderTracking.Application.Orders.AddOrderItem;

public sealed class AddOrderItemCommandHandler : IRequestHandler<AddOrderItemCommand, OrderItemDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly ICurrentUserService _currentUserService;

    public AddOrderItemCommandHandler(
        IApplicationDbContext context,
        IDateTimeProvider dateTimeProvider,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _dateTimeProvider = dateTimeProvider;
        _currentUserService = currentUserService;
    }

    public async Task<OrderItemDto> Handle(AddOrderItemCommand request, CancellationToken cancellationToken)
    {
        if (_currentUserService.UserId is not { } adminId)
        {
            throw new UnauthorizedAccessException();
        }

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
            UnitPrice = request.UnitPrice,
            CurrencyCode = request.UnitPrice.HasValue
                ? CurrencyCodes.Normalize(request.CurrencyCode)
                : null,
            SortOrder = maxSort + 1,
            CreatedAt = now,
        };

        order.UpdatedAt = now;
        _context.OrderItems.Add(item);

        await ScheduledStatusHistorySeeder.SeedForItemsAsync(
            _context,
            order,
            [item],
            adminId,
            cancellationToken);

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
            item.UnitPrice,
            item.CurrencyCode,
            item.SortOrder,
            item.CurrentStatusId,
            item.CurrentStatusText,
            item.CurrentStatusUpdatedAt);
}
