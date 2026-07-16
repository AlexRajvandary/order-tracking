using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Admins;
using OrderTracking.Application.Admins.Models;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Realtime;

namespace OrderTracking.Application.Admins.GetAdmins;

public sealed class GetAdminsQueryHandler : IRequestHandler<GetAdminsQuery, IReadOnlyList<AdminUserDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeProvider _clock;
    private readonly IPresenceRegistry _presence;

    public GetAdminsQueryHandler(IApplicationDbContext context, IDateTimeProvider clock, IPresenceRegistry presence)
    {
        _context = context;
        _clock = clock;
        _presence = presence;
    }

    public async Task<IReadOnlyList<AdminUserDto>> Handle(
        GetAdminsQuery request,
        CancellationToken cancellationToken)
    {
        var now = _clock.UtcNow;
        var users = await _context.AdminUsers
            .AsNoTracking()
            .OrderBy(u => u.Login)
            .ToListAsync(cancellationToken);

        var online = _presence.GetOnlineAdminIds();

        return users
            .Select(u => AdminUserMapping.ToDto(u, now) with { IsOnline = online.Contains(u.Id) })
            .ToList();
    }
}
