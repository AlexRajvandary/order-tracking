using MediatR;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Customers;
using OrderTracking.Application.Orders.Models;

namespace OrderTracking.Application.Orders.UpdateOrder;

public sealed class UpdateOrderCommandHandler : IRequestHandler<UpdateOrderCommand, OrderDetailsDto>
{
    private readonly ICustomerRepository _customerRepository;
    private readonly IOrderRepository _orderRepository;
    private readonly IUnitOfWork _unitOfWork;

    public UpdateOrderCommandHandler(
        IOrderRepository orderRepository,
        ICustomerRepository customerRepository,
        IUnitOfWork unitOfWork)
    {
        _orderRepository = orderRepository;
        _customerRepository = customerRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<OrderDetailsDto> Handle(UpdateOrderCommand request, CancellationToken cancellationToken)
    {
        var order = await _orderRepository.GetByIdWithCustomerAndItemsAsync(request.Id, cancellationToken)
            ?? throw new KeyNotFoundException($"Order '{request.Id}' was not found");

        if (request.CustomerId is { } customerId)
        {
            var customerExists = await _customerRepository.ExistsAsync(customerId, cancellationToken);

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

        if (request.CreatedAt is { } createdAt)
        {
            order.CreatedAt = createdAt;
        }

        order.UpdatedAt = DateTimeOffset.UtcNow;

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Reload customer for display name after update
        string? customerName = null;
        string? customerPhone = null;
        string? customerTelegram = null;
        string? customerWhatsApp = null;
        string? customerVk = null;
        string? customerEmail = null;

        if (order.CustomerId is { } cid)
        {
            var customer = await _customerRepository.GetByIdTrackedAsync(cid, cancellationToken);

            customerName = CustomerNameFormatting.Format(
                customer?.LastName,
                customer?.FirstName,
                customer?.Patronymic);
            customerPhone = customer?.Phone;
            customerTelegram = customer?.Telegram;
            customerWhatsApp = customer?.WhatsApp;
            customerVk = customer?.Vk;
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
            customerWhatsApp,
            customerVk,
            customerEmail,
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
                i.CurrentStatusUpdatedAt,
                i.SourceUrl)).ToList());
    }
}
