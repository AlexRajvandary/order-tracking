using MediatR;
using OrderTracking.Application.Admins.Models;
using OrderTracking.Application.Common.Interfaces;

namespace OrderTracking.Application.Admins.BindTelegram;

public sealed record BindAdminTelegramCommand(
    Guid AdminId,
    TelegramLoginData Data) : IRequest<AdminUserDto>;
