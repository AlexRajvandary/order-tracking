using MediatR;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Orders.Models;

namespace OrderTracking.Application.Orders.GetOrderById;

public sealed class GetOrderByIdQueryHandler : IRequestHandler<GetOrderByIdQuery, OrderDetailsDto>
{
    private readonly IOrderRepository _orderRepository;

    public GetOrderByIdQueryHandler(IOrderRepository orderRepository)
    {
        _orderRepository = orderRepository;
    }

    public async Task<OrderDetailsDto> Handle(GetOrderByIdQuery request, CancellationToken cancellationToken)
    {
        var order = await _orderRepository.GetDetailsByIdAsync(request.Id, cancellationToken)
            ?? throw new KeyNotFoundException($"Order '{request.Id}' was not found");

        return new OrderDetailsDto(
            order.Id, order.TrackingCode, order.CustomerId, order.CustomerName, order.CustomerPhone,
            order.CustomerTelegram, order.CustomerEmail, order.AdminNotes, order.CreatedByAdminId,
            order.Status, order.CreatedAt, order.UpdatedAt, order.ExpectedDeliveryAt,
            order.DeliveryAddressId, order.DeliveryCity, order.DeliveryStreet, order.DeliveryBuilding,
            order.DeliveryApartment, order.DeliveryPostalCode, order.DeliveryNote,
            order.Items.Select(i => new OrderItemDto(
                i.Id, i.ItemType, i.Name, i.Description, i.Quantity, i.UnitPrice, i.CurrencyCode,
                i.SortOrder, i.CurrentStatusId, i.CurrentStatusText, i.CurrentStatusUpdatedAt)).ToList());
    }
}
