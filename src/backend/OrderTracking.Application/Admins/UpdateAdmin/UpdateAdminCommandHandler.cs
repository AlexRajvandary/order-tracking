using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Admins;
using OrderTracking.Application.Admins.Models;
using OrderTracking.Application.Common.Interfaces;

namespace OrderTracking.Application.Admins.UpdateAdmin;

public sealed class UpdateAdminCommandHandler : IRequestHandler<UpdateAdminCommand, AdminUserDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IDateTimeProvider _clock;

    public UpdateAdminCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUser,
        IDateTimeProvider clock)
    {
        _context = context;
        _currentUser = currentUser;
        _clock = clock;
    }

    public async Task<AdminUserDto> Handle(UpdateAdminCommand request, CancellationToken cancellationToken)
    {
        var user = await _context.AdminUsers
            .FirstOrDefaultAsync(u => u.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException($"Admin '{request.Id}' was not found");

        var actorRole = AdminPermissionGuard.RequireActorRole(_currentUser);
        AdminPermissionGuard.EnsureCanManageTarget(actorRole, user);
        AdminPermissionGuard.EnsureCanChangeRole(actorRole, _currentUser.UserId, user, request.Role);

        if (_currentUser.UserId == user.Id && !request.IsActive)
        {
            throw new InvalidOperationException("You cannot deactivate your own account");
        }

        user.DisplayName = string.IsNullOrWhiteSpace(request.DisplayName) ? null : request.DisplayName.Trim();
        user.IsActive = request.IsActive;

        if (request.Role.HasValue && request.Role.Value != user.Role)
        {
            user.Role = request.Role.Value;
        }

        await _context.SaveChangesAsync(cancellationToken);

        return AdminUserMapping.ToDto(user, _clock.UtcNow);
    }
}
