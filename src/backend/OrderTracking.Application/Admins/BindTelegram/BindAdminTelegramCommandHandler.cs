using MediatR;
using OrderTracking.Application.Admins;
using OrderTracking.Application.Admins.Models;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Persistence;

namespace OrderTracking.Application.Admins.BindTelegram;

public sealed class BindAdminTelegramCommandHandler
    : IRequestHandler<BindAdminTelegramCommand, AdminUserDto>
{
    private readonly IAdminUserRepository _adminUsers;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ITelegramAuthValidator _telegramAuth;
    private readonly IDateTimeProvider _clock;
    private readonly ICurrentUserService _currentUser;

    public BindAdminTelegramCommandHandler(
        IAdminUserRepository adminUsers,
        IUnitOfWork unitOfWork,
        ITelegramAuthValidator telegramAuth,
        IDateTimeProvider clock,
        ICurrentUserService currentUser)
    {
        _adminUsers = adminUsers;
        _unitOfWork = unitOfWork;
        _telegramAuth = telegramAuth;
        _clock = clock;
        _currentUser = currentUser;
    }

    public async Task<AdminUserDto> Handle(
        BindAdminTelegramCommand request,
        CancellationToken cancellationToken)
    {
        var error = _telegramAuth.Validate(request.Data);
        if (error is not null)
        {
            throw new UnauthorizedAccessException(error);
        }

        var user = await _adminUsers.GetByIdTrackedAsync(request.AdminId, cancellationToken)
            ?? throw new KeyNotFoundException($"Admin '{request.AdminId}' was not found");

        var actorRole = AdminPermissionGuard.RequireActorRole(_currentUser);
        AdminPermissionGuard.EnsureCanManageTarget(actorRole, user);

        var taken = await _adminUsers.IsTelegramIdTakenAsync(
            request.Data.Id,
            request.AdminId,
            cancellationToken);

        if (taken)
        {
            throw new InvalidOperationException("This Telegram account is already linked to another admin");
        }

        user.TelegramId = request.Data.Id;
        user.TelegramUsername = string.IsNullOrWhiteSpace(request.Data.Username)
            ? null
            : request.Data.Username.Trim().TrimStart('@');
        user.TelegramAvatarUrl = string.IsNullOrWhiteSpace(request.Data.PhotoUrl)
            ? null
            : request.Data.PhotoUrl.Trim();

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return AdminUserMapping.ToDto(user, _clock.UtcNow);
    }
}
