using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Orders.AddOrderItem;
using OrderTracking.Application.Orders.Models;
using OrderTracking.Application.Orders.StatusPhotos;
using OrderTracking.Domain.Entities;

namespace OrderTracking.Application.Orders.UpdateOrderItemStatus;

public sealed class UpdateOrderItemStatusCommandHandler
    : IRequestHandler<UpdateOrderItemStatusCommand, OrderItemDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly IObjectStorage _objectStorage;
    private readonly IImageCompressor _imageCompressor;

    public UpdateOrderItemStatusCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IDateTimeProvider dateTimeProvider,
        IObjectStorage objectStorage,
        IImageCompressor imageCompressor)
    {
        _context = context;
        _currentUserService = currentUserService;
        _dateTimeProvider = dateTimeProvider;
        _objectStorage = objectStorage;
        _imageCompressor = imageCompressor;
    }

    public async Task<OrderItemDto> Handle(
        UpdateOrderItemStatusCommand request,
        CancellationToken cancellationToken)
    {
        if (_currentUserService.UserId is not { } adminId)
        {
            throw new UnauthorizedAccessException();
        }

        var order = await _context.Orders
            .FirstOrDefaultAsync(o => o.Id == request.OrderId, cancellationToken)
            ?? throw new KeyNotFoundException($"Order '{request.OrderId}' was not found");

        var item = await _context.OrderItems
            .FirstOrDefaultAsync(
                i => i.Id == request.ItemId && i.OrderId == request.OrderId,
                cancellationToken)
            ?? throw new KeyNotFoundException($"Order item '{request.ItemId}' was not found");

        string statusText;
        Guid? statusDefinitionId = null;

        if (request.StatusDefinitionId is { } definitionId)
        {
            var definition = await _context.StatusDefinitions
                .FirstOrDefaultAsync(s => s.Id == definitionId && s.IsActive, cancellationToken)
                ?? throw new KeyNotFoundException($"Status definition '{definitionId}' was not found");

            statusDefinitionId = definition.Id;
            statusText = definition.Name;
        }
        else
        {
            statusText = request.CustomStatusText!.Trim();
        }

        var now = _dateTimeProvider.UtcNow;

        var history = new OrderItemStatusHistory
        {
            Id = Guid.NewGuid(),
            OrderItemId = item.Id,
            StatusDefinitionId = statusDefinitionId,
            StatusText = statusText,
            Comment = string.IsNullOrWhiteSpace(request.Comment) ? null : request.Comment.Trim(),
            ChangedByAdminId = adminId,
            ChangedAt = now,
        };

        item.CurrentStatusId = statusDefinitionId;
        item.CurrentStatusText = statusText;
        item.CurrentStatusUpdatedAt = now;
        order.UpdatedAt = now;

        _context.OrderItemStatusHistories.Add(history);

        if (request.Photos is { Count: > 0 })
        {
            await StatusPhotoUploadHelper.UploadAsync(
                _context,
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

        await _context.SaveChangesAsync(cancellationToken);

        return AddOrderItemCommandHandler.Map(item);
    }
}
