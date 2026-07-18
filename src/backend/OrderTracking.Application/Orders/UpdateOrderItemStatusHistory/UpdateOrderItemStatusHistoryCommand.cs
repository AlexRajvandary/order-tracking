using MediatR;
using OrderTracking.Application.Statuses.Models;

namespace OrderTracking.Application.Orders.UpdateOrderItemStatusHistory;

public sealed record UpdateOrderItemStatusHistoryCommand(
    Guid OrderId,
    Guid HistoryId,
    string? StatusText,
    string? Comment,
    string? Country,
    string? Location,
    DateTimeOffset? PublishAt) : IRequest<StatusHistoryEntryDto>;
