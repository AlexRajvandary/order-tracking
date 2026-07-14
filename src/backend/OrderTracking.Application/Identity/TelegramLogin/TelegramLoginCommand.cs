using MediatR;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Models;

namespace OrderTracking.Application.Identity.TelegramLogin;

public sealed record TelegramLoginCommand(
    TelegramLoginData Data,
    string? IpAddress,
    string? UserAgent) : IRequest<AuthResultDto>;
