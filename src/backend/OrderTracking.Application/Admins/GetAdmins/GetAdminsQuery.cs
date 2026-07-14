using MediatR;
using OrderTracking.Application.Admins.Models;

namespace OrderTracking.Application.Admins.GetAdmins;

public sealed record GetAdminsQuery : IRequest<IReadOnlyList<AdminUserDto>>;
