using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Orders.StatusPhotos;
using OrderTracking.Application.Statuses.Models;

namespace OrderTracking.Application.Orders.AddStatusHistoryPhotos;

public sealed class AddStatusHistoryPhotosCommandHandler
    : IRequestHandler<AddStatusHistoryPhotosCommand, IReadOnlyList<StatusHistoryAttachmentDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly IObjectStorage _objectStorage;
    private readonly IImageCompressor _imageCompressor;

    public AddStatusHistoryPhotosCommandHandler(
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

    public async Task<IReadOnlyList<StatusHistoryAttachmentDto>> Handle(
        AddStatusHistoryPhotosCommand request,
        CancellationToken cancellationToken)
    {
        if (_currentUserService.UserId is not { } adminId)
        {
            throw new UnauthorizedAccessException();
        }

        var history = await _context.OrderItemStatusHistories
            .Include(h => h.OrderItem)
            .Include(h => h.Attachments)
            .FirstOrDefaultAsync(
                h => h.Id == request.HistoryId && h.OrderItem.OrderId == request.OrderId,
                cancellationToken)
            ?? throw new KeyNotFoundException($"Status history '{request.HistoryId}' was not found");

        var now = _dateTimeProvider.UtcNow;
        var nextSort = history.Attachments.Count == 0
            ? 0
            : history.Attachments.Max(a => a.SortOrder) + 1;

        var attachments = await StatusPhotoUploadHelper.UploadAsync(
            _context,
            _objectStorage,
            _imageCompressor,
            request.OrderId,
            history.Id,
            adminId,
            now,
            nextSort,
            request.Photos,
            cancellationToken);

        var order = await _context.Orders
            .FirstAsync(o => o.Id == request.OrderId, cancellationToken);
        order.UpdatedAt = now;

        await _context.SaveChangesAsync(cancellationToken);

        var admin = await _context.AdminUsers
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == adminId, cancellationToken);

        var adminName = admin?.DisplayName ?? admin?.Login;

        return attachments
            .Select(a => new StatusHistoryAttachmentDto(
                a.Id,
                $"/attachments/{a.Id}",
                a.ContentType,
                a.UploadedByAdminId,
                adminName,
                a.UploadedAt))
            .ToList();
    }
}
