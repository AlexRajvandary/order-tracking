using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Tracking.Models;

namespace OrderTracking.Application.Tracking.GetOrderByTrackingCode;

public sealed class GetOrderByTrackingCodeQueryHandler
    : IRequestHandler<GetOrderByTrackingCodeQuery, PublicTrackingDto>
{
    private readonly IApplicationDbContext _context;

    public GetOrderByTrackingCodeQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PublicTrackingDto> Handle(
        GetOrderByTrackingCodeQuery request,
        CancellationToken cancellationToken)
    {
        var code = request.TrackingCode.Trim().ToUpperInvariant();

        var order = await _context.Orders
            .AsNoTracking()
            .Where(o => o.TrackingCode == code)
            .Select(o => new
            {
                o.TrackingCode,
                o.CreatedAt,
                o.ExpectedDeliveryAt,
                Status = o.Status.ToString(),
                Items = o.Items
                    .OrderBy(i => i.SortOrder)
                    .Select(i => new
                    {
                        i.Name,
                        Type = i.ItemType.ToString(),
                        i.Quantity,
                        CurrentStatus = i.CurrentStatusText,
                        StatusColor = i.CurrentStatus != null ? i.CurrentStatus.Color : null,
                        History = i.StatusHistory
                            .OrderByDescending(h => h.ChangedAt)
                            .Select(h => new
                            {
                                h.StatusText,
                                h.Comment,
                                h.ChangedAt,
                                Attachments = h.Attachments
                                    .OrderBy(a => a.SortOrder)
                                    .Select(a => new
                                    {
                                        a.Id,
                                        a.ContentType,
                                        UploadedByAdminName = a.UploadedByAdmin.DisplayName
                                            ?? a.UploadedByAdmin.Login,
                                        a.UploadedAt,
                                    })
                                    .ToList(),
                            })
                            .ToList(),
                    })
                    .ToList(),
            })
            .FirstOrDefaultAsync(cancellationToken)
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
                    h.ChangedAt,
                    h.Attachments.Select(a => new PublicStatusAttachmentDto(
                        a.Id,
                        $"/attachments/{a.Id}",
                        a.ContentType,
                        a.UploadedByAdminName,
                        a.UploadedAt)).ToList())).ToList())).ToList());
    }
}
