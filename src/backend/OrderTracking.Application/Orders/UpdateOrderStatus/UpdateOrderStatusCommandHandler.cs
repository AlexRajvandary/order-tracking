using MediatR;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Customers;
using OrderTracking.Application.Orders.Models;

namespace OrderTracking.Application.Orders.UpdateOrderStatus;

public sealed class UpdateOrderStatusCommandHandler
    : IRequestHandler<UpdateOrderStatusCommand, OrderDetailsDto>
{
    private readonly IOrderRepository _orderRepository;
    private readonly IUnitOfWork _unitOfWork;

    public UpdateOrderStatusCommandHandler(IOrderRepository orderRepository, IUnitOfWork unitOfWork)
    {
        _orderRepository = orderRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<OrderDetailsDto> Handle(
        UpdateOrderStatusCommand request,
        CancellationToken cancellationToken)
    {
        var order = await _orderRepository.GetByIdWithCustomerAndItemsAsync(request.Id, cancellationToken)
            ?? throw new KeyNotFoundException($"Order '{request.Id}' was not found");

        order.Status = request.Status;

        await _unitOfWork.SaveChangesAsync(cancellationToken);

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
            order.Customer?.WhatsApp,
            order.Customer?.Vk,
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
