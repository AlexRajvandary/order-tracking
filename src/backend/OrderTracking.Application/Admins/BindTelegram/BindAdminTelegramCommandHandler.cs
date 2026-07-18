using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Admins;
using OrderTracking.Application.Admins.Models;
using OrderTracking.Application.Common.Interfaces;

namespace OrderTracking.Application.Admins.BindTelegram;

public sealed class BindAdminTelegramCommandHandler
    : IRequestHandler<BindAdminTelegramCommand, AdminUserDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ITelegramAuthValidator _telegramAuth;
    private readonly IDateTimeProvider _clock;
    private readonly ICurrentUserService _currentUser;

    public BindAdminTelegramCommandHandler(
        IApplicationDbContext context,
        ITelegramAuthValidator telegramAuth,
        IDateTimeProvider clock,
        ICurrentUserService currentUser)
    {
        _context = context;
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

        var user = await _context.AdminUsers
            .FirstOrDefaultAsync(u => u.Id == request.AdminId, cancellationToken)
            ?? throw new KeyNotFoundException($"Admin '{request.AdminId}' was not found");

        var actorRole = AdminPermissionGuard.RequireActorRole(_currentUser);
        AdminPermissionGuard.EnsureCanManageTarget(actorRole, user);

        var taken = await _context.AdminUsers
            .AnyAsync(
                u => u.TelegramId == request.Data.Id && u.Id != request.AdminId,
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

        await _context.SaveChangesAsync(cancellationToken);

        return AdminUserMapping.ToDto(user, _clock.UtcNow);
    }
}
