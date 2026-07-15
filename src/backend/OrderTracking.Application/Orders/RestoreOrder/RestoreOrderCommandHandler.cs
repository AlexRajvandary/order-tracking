using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Customers;
using OrderTracking.Application.Orders.Models;
using OrderTracking.Domain.Common;

namespace OrderTracking.Application.Orders.RestoreOrder;

public sealed class RestoreOrderCommandHandler : IRequestHandler<RestoreOrderCommand, OrderDetailsDto>
{
    private readonly IApplicationDbContext _context;

    public RestoreOrderCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<OrderDetailsDto> Handle(
        RestoreOrderCommand request,
        CancellationToken cancellationToken)
    {
        var order = await _context.Orders
            .IgnoreQueryFilters()
            .Include(o => o.Items)
            .Include(o => o.Customer)
            .FirstOrDefaultAsync(o => o.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException($"Order '{request.Id}' was not found");

        if (!order.IsDeleted)
        {
            throw new DomainException($"Order '{request.Id}' is not deleted");
        }

        var trackingCodeTaken = await _context.Orders
            .AnyAsync(o => o.TrackingCode == order.TrackingCode, cancellationToken);

        if (trackingCodeTaken)
        {
            throw new DomainException(
                $"Cannot restore order: tracking code '{order.TrackingCode}' is already used by another active order");
        }

        order.IsDeleted = false;
        order.DeletedAt = null;

        await _context.SaveChangesAsync(cancellationToken);

        var items = order.Items
            .Where(i => !i.IsDeleted)
            .OrderBy(i => i.SortOrder)
            .ToList();

        return new OrderDetailsDto(
            order.Id,
            order.TrackingCode,
            order.CustomerId,
            CustomerNameFormatting.Format(
                order.Customer?.LastName,
                order.Customer?.FirstName,
                order.Customer?.Patronymic),
            order.Customer?.Phone,
            order.Customer?.Telegram,
            order.Customer?.Email,
            order.AdminNotes,
            order.CreatedByAdminId,
            order.Status.ToString(),
            order.CreatedAt,
            order.UpdatedAt ?? order.CreatedAt,
            order.ExpectedDeliveryAt,
            order.DeliveryAddressId,
            order.DeliveryCity,
            order.DeliveryStreet,
            order.DeliveryBuilding,
            order.DeliveryApartment,
            order.DeliveryPostalCode,
            order.DeliveryNote,
            items.Select(i => new OrderItemDto(
                i.Id,
                i.ItemType.ToString(),
                i.Name,
                i.Description,
                i.Quantity,
                i.UnitPrice,
                i.CurrencyCode,
                i.SortOrder,
                i.CurrentStatusId,
                i.CurrentStatusText,
                i.CurrentStatusUpdatedAt)).ToList());
    }
}
