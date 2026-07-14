using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;

namespace OrderTracking.Application.Identity.Heartbeat;

public sealed class HeartbeatCommandHandler : IRequestHandler<HeartbeatCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IDateTimeProvider _clock;

    public HeartbeatCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUser,
        IDateTimeProvider clock)
    {
        _context = context;
        _currentUser = currentUser;
        _clock = clock;
    }

    public async Task Handle(HeartbeatCommand request, CancellationToken cancellationToken)
    {
        if (_currentUser.UserId is null)
        {
            throw new UnauthorizedAccessException();
        }

        var user = await _context.AdminUsers
            .FirstOrDefaultAsync(u => u.Id == _currentUser.UserId.Value, cancellationToken)
            ?? throw new UnauthorizedAccessException();

        user.LastSeenAt = _clock.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
    }
}
