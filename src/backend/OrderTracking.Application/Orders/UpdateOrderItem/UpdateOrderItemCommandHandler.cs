using MediatR;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Orders.AddOrderItem;
using OrderTracking.Application.Orders.Models;
using OrderTracking.Domain.Common;

namespace OrderTracking.Application.Orders.UpdateOrderItem;

public sealed class UpdateOrderItemCommandHandler : IRequestHandler<UpdateOrderItemCommand, OrderItemDto>
{
    private readonly IOrderRepository _orderRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDateTimeProvider _dateTimeProvider;

    public UpdateOrderItemCommandHandler(
        IOrderRepository orderRepository,
        IUnitOfWork unitOfWork,
        IDateTimeProvider dateTimeProvider)
    {
        _orderRepository = orderRepository;
        _unitOfWork = unitOfWork;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task<OrderItemDto> Handle(UpdateOrderItemCommand request, CancellationToken cancellationToken)
    {
        var order = await _orderRepository.GetByIdTrackedAsync(request.OrderId, cancellationToken)
            ?? throw new KeyNotFoundException($"Order '{request.OrderId}' was not found");

        var item = await _orderRepository.GetItemByIdForOrderAsync(
            request.OrderId, request.ItemId, cancellationToken)
            ?? throw new KeyNotFoundException($"Order item '{request.ItemId}' was not found");

        item.ItemType = request.ItemType;
        item.Name = request.Name.Trim();
        item.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        item.Quantity = request.Quantity <= 0 ? 1 : request.Quantity;
        item.UnitPrice = request.UnitPrice;
        item.CurrencyCode = request.UnitPrice.HasValue
            ? CurrencyCodes.Normalize(request.CurrencyCode)
            : null;
        order.UpdatedAt = _dateTimeProvider.UtcNow;

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return AddOrderItemCommandHandler.Map(item);
    }
}
