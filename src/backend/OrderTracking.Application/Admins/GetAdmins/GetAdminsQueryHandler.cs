using MediatR;
using OrderTracking.Application.Admins;
using OrderTracking.Application.Admins.Models;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Common.Realtime;

namespace OrderTracking.Application.Admins.GetAdmins;

public sealed class GetAdminsQueryHandler : IRequestHandler<GetAdminsQuery, IReadOnlyList<AdminUserDto>>
{
    private readonly IAdminUserRepository _adminUsers;
    private readonly IDateTimeProvider _clock;
    private readonly IPresenceRegistry _presence;

    public GetAdminsQueryHandler(IAdminUserRepository adminUsers, IDateTimeProvider clock, IPresenceRegistry presence)
    {
        _adminUsers = adminUsers;
        _clock = clock;
        _presence = presence;
    }

    public async Task<IReadOnlyList<AdminUserDto>> Handle(
        GetAdminsQuery request,
        CancellationToken cancellationToken)
    {
        var now = _clock.UtcNow;
        var users = await _adminUsers.ListOrderedByLoginAsync(cancellationToken);

        var online = _presence.GetOnlineAdminIds();

        return users
            .Select(u => AdminUserMapping.ToDto(u, now) with { IsOnline = online.Contains(u.Id) })
            .ToList();
    }
}
