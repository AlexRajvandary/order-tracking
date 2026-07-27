using MediatR;
using OrderTracking.Application.Admins;
using OrderTracking.Application.Admins.Models;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Domain.Entities;

namespace OrderTracking.Application.Admins.CreateAdmin;

public sealed class CreateAdminCommandHandler : IRequestHandler<CreateAdminCommand, AdminUserDto>
{
    private readonly IAdminUserRepository _adminUsers;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IDateTimeProvider _clock;
    private readonly ICurrentUserService _currentUser;

    public CreateAdminCommandHandler(
        IAdminUserRepository adminUsers,
        IUnitOfWork unitOfWork,
        IPasswordHasher passwordHasher,
        IDateTimeProvider clock,
        ICurrentUserService currentUser)
    {
        _adminUsers = adminUsers;
        _unitOfWork = unitOfWork;
        _passwordHasher = passwordHasher;
        _clock = clock;
        _currentUser = currentUser;
    }

    public async Task<AdminUserDto> Handle(CreateAdminCommand request, CancellationToken cancellationToken)
    {
        var actorRole = AdminPermissionGuard.RequireActorRole(_currentUser);
        AdminPermissionGuard.EnsureCanCreate(actorRole, request.Role);

        var login = request.Login.Trim();
        var exists = await _adminUsers.ExistsByLoginAsync(login, cancellationToken);

        if (exists)
        {
            throw new InvalidOperationException($"Admin with login '{login}' already exists");
        }

        var now = _clock.UtcNow;
        var user = new AdminUser
        {
            Id = Guid.NewGuid(),
            Login = login,
            DisplayName = string.IsNullOrWhiteSpace(request.DisplayName) ? null : request.DisplayName.Trim(),
            Role = request.Role,
            IsActive = true,
            SettingsJson = "{}",
            CreatedAt = now,
            UpdatedAt = now,
        };
        user.PasswordHash = _passwordHasher.Hash(user, request.Password);

        _adminUsers.Add(user);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return AdminUserMapping.ToDto(user, now);
    }
}
