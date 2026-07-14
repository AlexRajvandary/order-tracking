using MediatR;
using OrderTracking.Application.Common.Models;

namespace OrderTracking.Application.Identity.RefreshToken;

public sealed record RefreshTokenCommand(
    string RefreshToken,
    string? IpAddress,
    string? UserAgent) : IRequest<AuthResultDto>;
