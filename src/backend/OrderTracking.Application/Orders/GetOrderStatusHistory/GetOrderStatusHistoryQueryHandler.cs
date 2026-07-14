using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Statuses.Models;

namespace OrderTracking.Application.Orders.GetOrderStatusHistory;

public sealed class GetOrderStatusHistoryQueryHandler
    : IRequestHandler<GetOrderStatusHistoryQuery, IReadOnlyList<StatusHistoryEntryDto>>
{
    private readonly IApplicationDbContext _context;

    public GetOrderStatusHistoryQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<StatusHistoryEntryDto>> Handle(
        GetOrderStatusHistoryQuery request,
        CancellationToken cancellationToken)
    {
        var orderExists = await _context.Orders
            .AnyAsync(o => o.Id == request.OrderId, cancellationToken);

        if (!orderExists)
        {
            throw new KeyNotFoundException($"Order '{request.OrderId}' was not found");
        }

        return await _context.OrderItemStatusHistories
            .AsNoTracking()
            .Where(h => h.OrderItem.OrderId == request.OrderId)
            .OrderByDescending(h => h.ChangedAt)
            .Select(h => new StatusHistoryEntryDto(
                h.Id,
                h.OrderItemId,
                h.OrderItem.Name,
                h.OrderItem.ItemType.ToString(),
                h.StatusDefinitionId,
                h.StatusText,
                h.StatusDefinition != null ? h.StatusDefinition.Color : null,
                h.Comment,
                h.ChangedByAdminId,
                h.ChangedByAdmin.DisplayName ?? h.ChangedByAdmin.Login,
                h.ChangedAt,
                h.Attachments
                    .OrderBy(a => a.SortOrder)
                    .Select(a => new StatusHistoryAttachmentDto(
                        a.Id,
                        $"/attachments/{a.Id}",
                        a.ContentType,
                        a.UploadedByAdminId,
                        a.UploadedByAdmin.DisplayName ?? a.UploadedByAdmin.Login,
                        a.UploadedAt))
                    .ToList()))
            .ToListAsync(cancellationToken);
    }
}
