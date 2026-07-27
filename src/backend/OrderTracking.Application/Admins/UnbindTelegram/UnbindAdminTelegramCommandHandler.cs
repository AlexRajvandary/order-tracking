using MediatR;
using OrderTracking.Application.Admins;
using OrderTracking.Application.Admins.Models;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Persistence;

namespace OrderTracking.Application.Admins.UnbindTelegram;

public sealed class UnbindAdminTelegramCommandHandler
    : IRequestHandler<UnbindAdminTelegramCommand, AdminUserDto>
{
    private readonly IAdminUserRepository _adminUsers;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDateTimeProvider _clock;
    private readonly ICurrentUserService _currentUser;

    public UnbindAdminTelegramCommandHandler(
        IAdminUserRepository adminUsers,
        IUnitOfWork unitOfWork,
        IDateTimeProvider clock,
        ICurrentUserService currentUser)
    {
        _adminUsers = adminUsers;
        _unitOfWork = unitOfWork;
        _clock = clock;
        _currentUser = currentUser;
    }

    public async Task<AdminUserDto> Handle(
        UnbindAdminTelegramCommand request,
        CancellationToken cancellationToken)
    {
        var user = await _adminUsers.GetByIdTrackedAsync(request.AdminId, cancellationToken)
            ?? throw new KeyNotFoundException($"Admin '{request.AdminId}' was not found");

        var actorRole = AdminPermissionGuard.RequireActorRole(_currentUser);
        AdminPermissionGuard.EnsureCanManageTarget(actorRole, user);

        user.TelegramId = null;
        user.TelegramUsername = null;
        user.TelegramAvatarUrl = null;
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return AdminUserMapping.ToDto(user, _clock.UtcNow);
    }
}
