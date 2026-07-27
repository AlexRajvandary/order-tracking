using MediatR;
using Microsoft.Extensions.Logging;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Orders.AddOrderItem;
using OrderTracking.Application.Orders.Models;
using OrderTracking.Application.Orders.StatusHistory;
using OrderTracking.Application.Orders.StatusPhotos;
using OrderTracking.Domain.Entities;

namespace OrderTracking.Application.Orders.UpdateOrderItemStatus;

public sealed class UpdateOrderItemStatusCommandHandler
    : IRequestHandler<UpdateOrderItemStatusCommand, OrderItemDto>
{
    private readonly IOrderRepository _orderRepository;
    private readonly IStatusDefinitionRepository _statusDefinitionRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUserService;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly IImageCompressor _imageCompressor;
    private readonly ILogger<UpdateOrderItemStatusCommandHandler> _logger;
    private readonly IObjectStorage _objectStorage;
    private readonly ITelegramAdminNotifier _telegramNotifier;

    public UpdateOrderItemStatusCommandHandler(
        IOrderRepository orderRepository,
        IStatusDefinitionRepository statusDefinitionRepository,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUserService,
        IDateTimeProvider dateTimeProvider,
        IObjectStorage objectStorage,
        IImageCompressor imageCompressor,
        ITelegramAdminNotifier telegramNotifier,
        ILogger<UpdateOrderItemStatusCommandHandler> logger)
    {
        _orderRepository = orderRepository;
        _statusDefinitionRepository = statusDefinitionRepository;
        _unitOfWork = unitOfWork;
        _currentUserService = currentUserService;
        _dateTimeProvider = dateTimeProvider;
        _objectStorage = objectStorage;
        _imageCompressor = imageCompressor;
        _telegramNotifier = telegramNotifier;
        _logger = logger;
    }

    public async Task<OrderItemDto> Handle(
        UpdateOrderItemStatusCommand request,
        CancellationToken cancellationToken)
    {
        if (_currentUserService.UserId is not { } adminId)
        {
            throw new UnauthorizedAccessException();
        }

        var order = await _orderRepository.GetByIdTrackedAsync(request.OrderId, cancellationToken)
            ?? throw new KeyNotFoundException($"Order '{request.OrderId}' was not found");

        var item = await _orderRepository.GetItemByIdForOrderAsync(
            request.OrderId, request.ItemId, cancellationToken)
            ?? throw new KeyNotFoundException($"Order item '{request.ItemId}' was not found");

        string statusText;
        Guid? statusDefinitionId = null;
        string? defaultCountry = null;
        string? defaultLocation = null;

        if (request.StatusDefinitionId is { } definitionId)
        {
            var definition = await _statusDefinitionRepository.GetActiveByIdAsync(
                definitionId, cancellationToken)
                ?? throw new KeyNotFoundException($"Status definition '{definitionId}' was not found");

            statusDefinitionId = definition.Id;
            statusText = definition.Name;
            defaultCountry = definition.DefaultCountry;
            defaultLocation = definition.DefaultLocation;
        }
        else
        {
            statusText = request.CustomStatusText!.Trim();
        }

        var now = _dateTimeProvider.UtcNow;
        var publishAt = request.PublishAt;
        var isPublished = publishAt is null || publishAt <= now;
        var effectivePublishAt = publishAt ?? now;
        var changedAt = isPublished ? effectivePublishAt : effectivePublishAt;

        var country = !string.IsNullOrWhiteSpace(request.Country)
            ? request.Country.Trim()
            : defaultCountry;
        var location = !string.IsNullOrWhiteSpace(request.Location)
            ? request.Location.Trim()
            : defaultLocation;

        var history = new OrderItemStatusHistory
        {
            Id = Guid.NewGuid(),
            OrderItemId = item.Id,
            StatusDefinitionId = statusDefinitionId,
            StatusText = statusText,
            Comment = string.IsNullOrWhiteSpace(request.Comment) ? null : request.Comment.Trim(),
            Country = country,
            Location = location,
            PublishAt = effectivePublishAt,
            IsPublished = isPublished,
            ChangedByAdminId = adminId,
            ChangedAt = changedAt,
        };

        order.UpdatedAt = now;
        _orderRepository.AddStatusHistory(history);

        if (isPublished)
        {
            OrderItemCurrentStatusSync.ApplyPublished(item, history);
        }

        if (request.Photos is { Count: > 0 })
        {
            await StatusPhotoUploadHelper.UploadAsync(
                _orderRepository,
                _objectStorage,
                _imageCompressor,
                order.Id,
                history.Id,
                adminId,
                now,
                startingSortOrder: 0,
                request.Photos,
                cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (isPublished)
        {
            try
            {
                await _telegramNotifier.NotifyStatusPublishedAsync(
                    order.Id,
                    order.TrackingCode,
                    statusText,
                    item.Name,
                    country,
                    location,
                    history.Id,
                    cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Telegram notify failed for history {HistoryId}", history.Id);
            }
        }

        return AddOrderItemCommandHandler.Map(item);
    }
}
