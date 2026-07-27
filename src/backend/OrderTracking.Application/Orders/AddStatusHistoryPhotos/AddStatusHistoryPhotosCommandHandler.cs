using MediatR;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Orders.StatusPhotos;
using OrderTracking.Application.Statuses.Models;

namespace OrderTracking.Application.Orders.AddStatusHistoryPhotos;

public sealed class AddStatusHistoryPhotosCommandHandler
    : IRequestHandler<AddStatusHistoryPhotosCommand, IReadOnlyList<StatusHistoryAttachmentDto>>
{
    private readonly IAdminUserRepository _adminUserRepository;
    private readonly IOrderRepository _orderRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUserService;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly IObjectStorage _objectStorage;
    private readonly IImageCompressor _imageCompressor;

    public AddStatusHistoryPhotosCommandHandler(
        IOrderRepository orderRepository,
        IAdminUserRepository adminUserRepository,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUserService,
        IDateTimeProvider dateTimeProvider,
        IObjectStorage objectStorage,
        IImageCompressor imageCompressor)
    {
        _orderRepository = orderRepository;
        _adminUserRepository = adminUserRepository;
        _unitOfWork = unitOfWork;
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

        var history = await _orderRepository.GetStatusHistoryWithAttachmentsForUpdateAsync(
                request.OrderId, request.HistoryId, cancellationToken)
            ?? throw new KeyNotFoundException($"Status history '{request.HistoryId}' was not found");

        var now = _dateTimeProvider.UtcNow;
        var nextSort = history.Attachments.Count == 0
            ? 0
            : history.Attachments.Max(a => a.SortOrder) + 1;

        var attachments = await StatusPhotoUploadHelper.UploadAsync(
            _orderRepository,
            _objectStorage,
            _imageCompressor,
            request.OrderId,
            history.Id,
            adminId,
            now,
            nextSort,
            request.Photos,
            cancellationToken);

        var order = await _orderRepository.GetByIdTrackedAsync(request.OrderId, cancellationToken)
            ?? throw new KeyNotFoundException($"Order '{request.OrderId}' was not found");
        order.UpdatedAt = now;

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var admin = await _adminUserRepository.GetByIdUntrackedAsync(adminId, cancellationToken);

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
