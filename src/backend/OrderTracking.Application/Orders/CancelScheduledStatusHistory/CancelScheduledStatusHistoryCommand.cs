using MediatR;
using OrderTracking.Application.Common.Interfaces;

namespace OrderTracking.Application.Orders.CancelScheduledStatusHistory;

public sealed record CancelScheduledStatusHistoryCommand(Guid OrderId, Guid HistoryId)
    : IRequest, IAuditableCommand;
