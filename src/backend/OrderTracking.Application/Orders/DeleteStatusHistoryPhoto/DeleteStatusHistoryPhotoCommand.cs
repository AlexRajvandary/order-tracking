using MediatR;
using OrderTracking.Application.Common.Interfaces;

namespace OrderTracking.Application.Orders.DeleteStatusHistoryPhoto;

public sealed record DeleteStatusHistoryPhotoCommand(
    Guid OrderId,
    Guid HistoryId,
    Guid AttachmentId) : IRequest, IAuditableCommand;
