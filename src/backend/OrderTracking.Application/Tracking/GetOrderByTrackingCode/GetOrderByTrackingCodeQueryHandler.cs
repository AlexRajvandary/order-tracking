using MediatR;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Tracking.Models;

namespace OrderTracking.Application.Tracking.GetOrderByTrackingCode;

public sealed class GetOrderByTrackingCodeQueryHandler
    : IRequestHandler<GetOrderByTrackingCodeQuery, PublicTrackingDto>
{
    private readonly IOrderRepository _orderRepository;

    public GetOrderByTrackingCodeQueryHandler(IOrderRepository orderRepository)
    {
        _orderRepository = orderRepository;
    }

    public async Task<PublicTrackingDto> Handle(
        GetOrderByTrackingCodeQuery request,
        CancellationToken cancellationToken)
    {
        var code = request.TrackingCode.Trim().ToUpperInvariant();

        var order = await _orderRepository.GetPublicTrackingByCodeAsync(code, cancellationToken)
            ?? throw new KeyNotFoundException("Order not found");

        return new PublicTrackingDto(
            order.TrackingCode,
            order.CreatedAt,
            order.ExpectedDeliveryAt,
            order.Status,
            order.Items.Select(i => new PublicTrackingItemDto(
                i.Name,
                i.Type,
                i.Quantity,
                i.CurrentStatus,
                i.StatusColor,
                i.History.Select(h => new PublicStatusHistoryDto(
                    h.StatusText,
                    h.Comment,
                    h.Country,
                    h.Location,
                    h.ChangedAt,
                    h.Attachments.Select(a => new PublicStatusAttachmentDto(
                        a.Id,
                        $"/attachments/{a.Id}",
                        a.ContentType,
                        a.UploadedByAdminName,
                        a.UploadedAt)).ToList())).ToList())).ToList());
    }
}
