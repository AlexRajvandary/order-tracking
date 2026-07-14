using MediatR;
using OrderTracking.Application.Statuses.Models;

namespace OrderTracking.Application.Orders.GetOrderStatusHistory;

public sealed record GetOrderStatusHistoryQuery(Guid OrderId)
    : IRequest<IReadOnlyList<StatusHistoryEntryDto>>;
