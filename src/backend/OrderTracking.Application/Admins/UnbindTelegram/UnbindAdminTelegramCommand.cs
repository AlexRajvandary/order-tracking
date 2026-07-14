using MediatR;
using OrderTracking.Application.Admins.Models;

namespace OrderTracking.Application.Admins.UnbindTelegram;

public sealed record UnbindAdminTelegramCommand(Guid AdminId) : IRequest<AdminUserDto>;
