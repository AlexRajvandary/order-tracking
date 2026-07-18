using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Orders.StatusHistory;
using OrderTracking.Application.Statuses.Models;

namespace OrderTracking.Application.Orders.UpdateOrderItemStatusHistory;

public sealed class UpdateOrderItemStatusHistoryCommandHandler
    : IRequestHandler<UpdateOrderItemStatusHistoryCommand, StatusHistoryEntryDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeProvider _dateTimeProvider;

    public UpdateOrderItemStatusHistoryCommandHandler(
        IApplicationDbContext context,
        IDateTimeProvider dateTimeProvider)
    {
        _context = context;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task<StatusHistoryEntryDto> Handle(
        UpdateOrderItemStatusHistoryCommand request,
        CancellationToken cancellationToken)
    {
        var history = await _context.OrderItemStatusHistories
            .Include(h => h.OrderItem)
            .Include(h => h.StatusDefinition)
            .Include(h => h.ChangedByAdmin)
            .Include(h => h.Attachments)
            .ThenInclude(a => a.UploadedByAdmin)
            .FirstOrDefaultAsync(
                h => h.Id == request.HistoryId && h.OrderItem.OrderId == request.OrderId,
                cancellationToken)
            ?? throw new KeyNotFoundException($"Status history '{request.HistoryId}' was not found");

        if (request.StatusText is not null)
        {
            var trimmed = request.StatusText.Trim();
            if (string.IsNullOrWhiteSpace(trimmed))
            {
                throw new InvalidOperationException("Status text cannot be empty");
            }

            history.StatusText = trimmed;
        }

        if (request.Comment is not null)
        {
            history.Comment = string.IsNullOrWhiteSpace(request.Comment)
                ? null
                : request.Comment.Trim();
        }

        if (request.Country is not null)
        {
            history.Country = string.IsNullOrWhiteSpace(request.Country)
                ? null
                : request.Country.Trim();
        }

        if (request.Location is not null)
        {
            history.Location = string.IsNullOrWhiteSpace(request.Location)
                ? null
                : request.Location.Trim();
        }

        var now = _dateTimeProvider.UtcNow;

        if (request.PublishAt is { } publishAt)
        {
            history.PublishAt = publishAt;
            if (publishAt > now)
            {
                history.IsPublished = false;
                history.ChangedAt = publishAt;
            }
            else
            {
                history.IsPublished = true;
                history.ChangedAt = publishAt;
            }
        }

        var order = await _context.Orders
            .FirstAsync(o => o.Id == request.OrderId, cancellationToken);
        order.UpdatedAt = now;

        await OrderItemCurrentStatusSync.SyncFromPublishedHistoryAsync(
            _context,
            history.OrderItem,
            cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        return Map(history);
    }

    private static StatusHistoryEntryDto Map(Domain.Entities.OrderItemStatusHistory h) =>
        new(
            h.Id,
            h.OrderItemId,
            h.OrderItem.Name,
            h.OrderItem.ItemType.ToString(),
            h.StatusDefinitionId,
            h.StatusText,
            h.StatusDefinition?.Color,
            h.Comment,
            h.Country,
            h.Location,
            h.PublishAt,
            h.IsPublished,
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
                .ToList());
}
