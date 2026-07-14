using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Orders.Models;

namespace OrderTracking.Application.Orders.UpdateOrder;

public sealed class UpdateOrderCommandHandler : IRequestHandler<UpdateOrderCommand, OrderDetailsDto>
{
    private readonly IApplicationDbContext _context;

    public UpdateOrderCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<OrderDetailsDto> Handle(UpdateOrderCommand request, CancellationToken cancellationToken)
    {
        var order = await _context.Orders
            .Include(o => o.Items)
            .Include(o => o.Customer)
            .FirstOrDefaultAsync(o => o.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException($"Order '{request.Id}' was not found");

        if (request.CustomerId is { } customerId)
        {
            var customerExists = await _context.Customers
                .AnyAsync(c => c.Id == customerId, cancellationToken);

            if (!customerExists)
            {
                throw new KeyNotFoundException($"Customer '{customerId}' was not found");
            }

            order.CustomerId = customerId;
        }
        else
        {
            order.CustomerId = null;
        }

        order.AdminNotes = string.IsNullOrWhiteSpace(request.AdminNotes)
            ? null
            : request.AdminNotes.Trim();

        order.ExpectedDeliveryAt = request.ExpectedDeliveryAt;
        order.UpdatedAt = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        // Reload customer for display name after update
        string? customerName = null;
        string? customerPhone = null;
        string? customerTelegram = null;
        string? customerEmail = null;

        if (order.CustomerId is { } cid)
        {
            var customer = await _context.Customers
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == cid, cancellationToken);

            customerName = customer?.FullName;
            customerPhone = customer?.Phone;
            customerTelegram = customer?.Telegram;
            customerEmail = customer?.Email;
        }

        var items = order.Items
            .Where(i => !i.IsDeleted)
            .OrderBy(i => i.SortOrder)
            .ToList();

        return new OrderDetailsDto(
            order.Id,
            order.TrackingCode,
            order.CustomerId,
            customerName,
            customerPhone,
            customerTelegram,
            customerEmail,
            order.AdminNotes,
            order.CreatedByAdminId,
            order.Status.ToString(),
            order.CreatedAt,
            order.UpdatedAt ?? order.CreatedAt,
            order.ExpectedDeliveryAt,
            items.Select(i => new OrderItemDto(
                i.Id,
                i.ItemType.ToString(),
                i.Name,
                i.Description,
                i.Quantity,
                i.SortOrder,
                i.CurrentStatusId,
                i.CurrentStatusText,
                i.CurrentStatusUpdatedAt)).ToList());
    }
}
