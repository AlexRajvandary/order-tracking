using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Tracking.Models;
using OrderTracking.Domain.Enums;

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
                LastUpdatedAt = o.UpdatedAt ?? o.CreatedAt,
                CustomerName = o.Customer != null
                    ? ((o.Customer.LastName ?? "") + " " + (o.Customer.FirstName ?? "") + " " + (o.Customer.Patronymic ?? "")).Trim()
                    : null,
                CustomerEmail = o.Customer != null ? o.Customer.Email : null,
                CustomerTelegram = o.Customer != null ? o.Customer.Telegram : null,
                Items = o.Items
                    .OrderBy(i => i.SortOrder)
                    .Select(i => new
                    {
                        i.Name,
                        Type = i.ItemType.ToString(),
                        ItemType = i.ItemType,
                        i.Quantity,
                        CurrentStatus = i.CurrentStatusText,
                        StatusColor = i.CurrentStatus != null ? i.CurrentStatus.Color : null,
                        IsFinal = i.CurrentStatus != null && i.CurrentStatus.IsFinal,
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

        var productItems = order.Items.Where(i => i.ItemType == OrderItemType.Product).ToList();
        var overallIsFinal = productItems.Count > 0 && productItems.All(i => i.IsFinal);

        return new PublicTrackingDto(
            order.TrackingCode,
            order.CreatedAt,
            order.LastUpdatedAt,
            order.CustomerName,
            order.CustomerEmail,
            order.CustomerTelegram,
            overallIsFinal,
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
