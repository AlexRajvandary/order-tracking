using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Orders.Models;

namespace OrderTracking.Application.Orders.GetOrderById;

public sealed class GetOrderByIdQueryHandler : IRequestHandler<GetOrderByIdQuery, OrderDetailsDto>
{
    private readonly IApplicationDbContext _context;

    public GetOrderByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<OrderDetailsDto> Handle(GetOrderByIdQuery request, CancellationToken cancellationToken)
    {
        var order = await _context.Orders
            .AsNoTracking()
            .Where(o => o.Id == request.Id)
            .Select(o => new OrderDetailsDto(
                o.Id,
                o.TrackingCode,
                o.CustomerId,
                o.Customer != null
                    ? ((o.Customer.LastName ?? "") + " " + (o.Customer.FirstName ?? "") + " " + (o.Customer.Patronymic ?? "")).Trim()
                    : null,
                o.Customer != null ? o.Customer.Phone : null,
                o.Customer != null ? o.Customer.Telegram : null,
                o.Customer != null ? o.Customer.Email : null,
                o.AdminNotes,
                o.CreatedByAdminId,
                o.Status.ToString(),
                o.CreatedAt,
                o.UpdatedAt ?? o.CreatedAt,
                o.ExpectedDeliveryAt,
                o.DeliveryAddressId,
                o.DeliveryCity,
                o.DeliveryStreet,
                o.DeliveryBuilding,
                o.DeliveryApartment,
                o.DeliveryPostalCode,
                o.DeliveryNote,
                o.Items
                    .OrderBy(i => i.SortOrder)
                    .Select(i => new OrderItemDto(
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
                        i.CurrentStatusUpdatedAt))
                    .ToList()))
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new KeyNotFoundException($"Order '{request.Id}' was not found");

        return order;
    }
}
