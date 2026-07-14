using MediatR;
using OrderTracking.Application.Common.Models;

namespace OrderTracking.Application.Identity.GetCurrentUser;

public sealed record GetCurrentUserQuery : IRequest<CurrentUserDto>;
