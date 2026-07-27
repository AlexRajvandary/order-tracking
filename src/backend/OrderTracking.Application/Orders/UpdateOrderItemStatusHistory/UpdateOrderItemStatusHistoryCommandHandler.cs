using MediatR;
using Microsoft.Extensions.Logging;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Orders.StatusHistory;
using OrderTracking.Application.Statuses.Models;

namespace OrderTracking.Application.Orders.UpdateOrderItemStatusHistory;

public sealed class UpdateOrderItemStatusHistoryCommandHandler
    : IRequestHandler<UpdateOrderItemStatusHistoryCommand, StatusHistoryEntryDto>
{
    private readonly IOrderRepository _orderRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly ILogger<UpdateOrderItemStatusHistoryCommandHandler> _logger;
    private readonly ITelegramAdminNotifier _telegramNotifier;

    public UpdateOrderItemStatusHistoryCommandHandler(
        IOrderRepository orderRepository,
        IUnitOfWork unitOfWork,
        IDateTimeProvider dateTimeProvider,
        ITelegramAdminNotifier telegramNotifier,
        ILogger<UpdateOrderItemStatusHistoryCommandHandler> logger)
    {
        _orderRepository = orderRepository;
        _unitOfWork = unitOfWork;
        _dateTimeProvider = dateTimeProvider;
        _telegramNotifier = telegramNotifier;
        _logger = logger;
    }

    public async Task<StatusHistoryEntryDto> Handle(
        UpdateOrderItemStatusHistoryCommand request,
        CancellationToken cancellationToken)
    {
        var history = await _orderRepository.GetStatusHistoryWithDetailsForUpdateAsync(
                request.OrderId, request.HistoryId, cancellationToken)
            ?? throw new KeyNotFoundException($"Status history '{request.HistoryId}' was not found");

        var wasPublished = history.IsPublished;

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
                history.TelegramNotifiedAt = null;
            }
            else
            {
                history.IsPublished = true;
                history.ChangedAt = publishAt;
            }
        }

        var order = await _orderRepository.GetByIdTrackedAsync(request.OrderId, cancellationToken)
            ?? throw new KeyNotFoundException($"Order '{request.OrderId}' was not found");
        order.UpdatedAt = now;

        await OrderItemCurrentStatusSync.SyncFromPublishedHistoryAsync(
            _orderRepository,
            history.OrderItem,
            cancellationToken);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (!wasPublished && history.IsPublished)
        {
            try
            {
                await _telegramNotifier.NotifyStatusPublishedAsync(
                    request.OrderId,
                    order.TrackingCode,
                    history.StatusText,
                    history.OrderItem.Name,
                    history.Country,
                    history.Location,
                    history.Id,
                    cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Telegram notify failed for history {HistoryId}", history.Id);
            }
        }

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
