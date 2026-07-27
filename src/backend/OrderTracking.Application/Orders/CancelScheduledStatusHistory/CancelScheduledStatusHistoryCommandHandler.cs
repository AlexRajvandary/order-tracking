using MediatR;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Orders.StatusHistory;

namespace OrderTracking.Application.Orders.CancelScheduledStatusHistory;

public sealed class CancelScheduledStatusHistoryCommandHandler
    : IRequestHandler<CancelScheduledStatusHistoryCommand>
{
    private readonly IOrderRepository _orderRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDateTimeProvider _dateTimeProvider;

    public CancelScheduledStatusHistoryCommandHandler(
        IOrderRepository orderRepository,
        IUnitOfWork unitOfWork,
        IDateTimeProvider dateTimeProvider)
    {
        _orderRepository = orderRepository;
        _unitOfWork = unitOfWork;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task Handle(
        CancelScheduledStatusHistoryCommand request,
        CancellationToken cancellationToken)
    {
        var history = await _orderRepository.GetStatusHistoryByIdForOrderAsync(
                request.OrderId, request.HistoryId, cancellationToken)
            ?? throw new KeyNotFoundException($"Status history '{request.HistoryId}' was not found");

        if (history.IsPublished)
        {
            throw new InvalidOperationException(
                "Only scheduled (unpublished) status history entries can be cancelled");
        }

        var order = await _orderRepository.GetByIdTrackedAsync(request.OrderId, cancellationToken)
            ?? throw new KeyNotFoundException($"Order '{request.OrderId}' was not found");
        order.UpdatedAt = _dateTimeProvider.UtcNow;

        _orderRepository.RemoveStatusHistory(history);

        await OrderItemCurrentStatusSync.SyncFromPublishedHistoryAsync(
            _orderRepository,
            history.OrderItem,
            cancellationToken);

        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
