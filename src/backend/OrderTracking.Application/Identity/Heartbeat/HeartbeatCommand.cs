using MediatR;

namespace OrderTracking.Application.Identity.Heartbeat;

public sealed record HeartbeatCommand : IRequest;
