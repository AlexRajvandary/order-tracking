using MediatR;
using OrderTracking.Application.Tracking.Models;

namespace OrderTracking.Application.Tracking.GetOrderByTrackingCode;

public sealed record GetOrderByTrackingCodeQuery(string TrackingCode) : IRequest<PublicTrackingDto>;
