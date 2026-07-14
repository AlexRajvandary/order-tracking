using MediatR;
using OrderTracking.Application.Orders.Models;

namespace OrderTracking.Application.Orders.GetOrderTrackingLink;

public sealed record GetOrderTrackingLinkQuery(Guid OrderId) : IRequest<TrackingLinkDto>;
