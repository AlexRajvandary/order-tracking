using MediatR;
using OrderTracking.Application.Common.Models;

namespace OrderTracking.Application.Identity.Login;

public sealed record LoginCommand(
    string Login,
    string Password,
    string? IpAddress,
    string? UserAgent) : IRequest<AuthResultDto>;
