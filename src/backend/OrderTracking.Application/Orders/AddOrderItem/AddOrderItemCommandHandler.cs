using MediatR;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Orders.Models;
using OrderTracking.Application.Orders.StatusHistory;
using OrderTracking.Domain.Common;
using OrderTracking.Domain.Entities;

namespace OrderTracking.Application.Orders.AddOrderItem;

public sealed class AddOrderItemCommandHandler : IRequestHandler<AddOrderItemCommand, OrderItemDto>
{
    private readonly IOrderRepository _orderRepository;
    private readonly IStatusDefinitionRepository _statusDefinitionRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly ICurrentUserService _currentUserService;

    public AddOrderItemCommandHandler(
        IOrderRepository orderRepository,
        IStatusDefinitionRepository statusDefinitionRepository,
        IUnitOfWork unitOfWork,
        IDateTimeProvider dateTimeProvider,
        ICurrentUserService currentUserService)
    {
        _orderRepository = orderRepository;
        _statusDefinitionRepository = statusDefinitionRepository;
        _unitOfWork = unitOfWork;
        _dateTimeProvider = dateTimeProvider;
        _currentUserService = currentUserService;
    }

    public async Task<OrderItemDto> Handle(AddOrderItemCommand request, CancellationToken cancellationToken)
    {
        if (_currentUserService.UserId is not { } adminId)
        {
            throw new UnauthorizedAccessException();
        }

        var order = await _orderRepository.GetByIdTrackedAsync(request.OrderId, cancellationToken)
            ?? throw new KeyNotFoundException($"Order '{request.OrderId}' was not found");

        var maxSort = await _orderRepository.GetMaxItemSortOrderAsync(request.OrderId, cancellationToken);

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
        _orderRepository.AddItem(item);

        await ScheduledStatusHistorySeeder.SeedForItemsAsync(
            _orderRepository,
            _statusDefinitionRepository,
            order,
            [item],
            adminId,
            cancellationToken);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

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
