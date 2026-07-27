using MediatR;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Persistence;

namespace OrderTracking.Application.Identity.Heartbeat;

public sealed class HeartbeatCommandHandler : IRequestHandler<HeartbeatCommand>
{
    private readonly IAdminUserRepository _adminUsers;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IDateTimeProvider _clock;

    public HeartbeatCommandHandler(
        IAdminUserRepository adminUsers,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUser,
        IDateTimeProvider clock)
    {
        _adminUsers = adminUsers;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _clock = clock;
    }

    public async Task Handle(HeartbeatCommand request, CancellationToken cancellationToken)
    {
        if (_currentUser.UserId is null)
        {
            throw new UnauthorizedAccessException();
        }

        var user = await _adminUsers.GetByIdTrackedAsync(_currentUser.UserId.Value, cancellationToken)
            ?? throw new UnauthorizedAccessException();

        user.LastSeenAt = _clock.UtcNow;
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
