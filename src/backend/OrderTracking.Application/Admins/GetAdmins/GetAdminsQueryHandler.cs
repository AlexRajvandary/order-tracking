using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Admins;
using OrderTracking.Application.Admins.Models;
using OrderTracking.Application.Common.Interfaces;

namespace OrderTracking.Application.Admins.GetAdmins;

public sealed class GetAdminsQueryHandler : IRequestHandler<GetAdminsQuery, IReadOnlyList<AdminUserDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeProvider _clock;

    public GetAdminsQueryHandler(IApplicationDbContext context, IDateTimeProvider clock)
    {
        _context = context;
        _clock = clock;
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

        return users.Select(u => AdminUserMapping.ToDto(u, now)).ToList();
    }
}
