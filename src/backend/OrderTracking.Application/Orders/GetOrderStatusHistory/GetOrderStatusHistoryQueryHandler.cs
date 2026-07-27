using MediatR;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Statuses.Models;

namespace OrderTracking.Application.Orders.GetOrderStatusHistory;

public sealed class GetOrderStatusHistoryQueryHandler
    : IRequestHandler<GetOrderStatusHistoryQuery, IReadOnlyList<StatusHistoryEntryDto>>
{
    private readonly IOrderRepository _orderRepository;

    public GetOrderStatusHistoryQueryHandler(IOrderRepository orderRepository)
    {
        _orderRepository = orderRepository;
    }

    public async Task<IReadOnlyList<StatusHistoryEntryDto>> Handle(
        GetOrderStatusHistoryQuery request,
        CancellationToken cancellationToken)
    {
        var orderExists = await _orderRepository.ExistsAsync(request.OrderId, cancellationToken);

        if (!orderExists)
        {
            throw new KeyNotFoundException($"Order '{request.OrderId}' was not found");
        }

        var histories = await _orderRepository.GetStatusHistoryForOrderAsync(
            request.OrderId,
            cancellationToken);

        return histories.Select(h => new StatusHistoryEntryDto(
            h.Id, h.OrderItemId, h.OrderItemName, h.OrderItemType, h.StatusDefinitionId,
            h.StatusText, h.StatusColor, h.Comment, h.Country, h.Location, h.PublishAt,
            h.IsPublished, h.ChangedByAdminId, h.ChangedByAdminName, h.ChangedAt,
            h.Attachments.Select(a => new StatusHistoryAttachmentDto(
                a.Id, $"/attachments/{a.Id}", a.ContentType, a.UploadedByAdminId,
                a.UploadedByAdminName, a.UploadedAt)).ToList())).ToList();
    }
}
