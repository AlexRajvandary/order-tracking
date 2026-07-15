using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Domain.Common;
using OrderTracking.Domain.Entities;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Application.Admins;

public static class AdminPermissionGuard
{
    public static AdminRole RequireActorRole(ICurrentUserService currentUser)
    {
        return currentUser.Role
            ?? throw new ForbiddenException("Current user role is missing");
    }

    public static void EnsureCanCreate(AdminRole actorRole, AdminRole targetRole)
    {
        if (actorRole == AdminRole.SuperAdmin)
        {
            return;
        }

        if (actorRole == AdminRole.Admin && targetRole == AdminRole.Moderator)
        {
            return;
        }

        throw new ForbiddenException("You are not allowed to create an admin with this role");
    }

    public static void EnsureCanManageTarget(AdminRole actorRole, AdminUser target)
    {
        if (actorRole == AdminRole.SuperAdmin)
        {
            return;
        }

        if (actorRole == AdminRole.Admin && target.Role == AdminRole.Moderator)
        {
            return;
        }

        throw new ForbiddenException("You are not allowed to manage this admin");
    }

    public static void EnsureCanChangeRole(
        AdminRole actorRole,
        Guid? actorUserId,
        AdminUser target,
        AdminRole? requestedRole)
    {
        if (requestedRole is null || requestedRole == target.Role)
        {
            return;
        }

        if (actorRole != AdminRole.SuperAdmin)
        {
            throw new ForbiddenException("Only SuperAdmin can change roles");
        }

        if (actorUserId == target.Id)
        {
            throw new ForbiddenException("You cannot change your own role");
        }
    }
}
