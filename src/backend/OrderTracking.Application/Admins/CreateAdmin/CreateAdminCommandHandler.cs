using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Admins;
using OrderTracking.Application.Admins.Models;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Domain.Entities;

namespace OrderTracking.Application.Admins.CreateAdmin;

public sealed class CreateAdminCommandHandler : IRequestHandler<CreateAdminCommand, AdminUserDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IDateTimeProvider _clock;
    private readonly ICurrentUserService _currentUser;

    public CreateAdminCommandHandler(
        IApplicationDbContext context,
        IPasswordHasher passwordHasher,
        IDateTimeProvider clock,
        ICurrentUserService currentUser)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _clock = clock;
        _currentUser = currentUser;
    }

    public async Task<AdminUserDto> Handle(CreateAdminCommand request, CancellationToken cancellationToken)
    {
        var actorRole = AdminPermissionGuard.RequireActorRole(_currentUser);
        AdminPermissionGuard.EnsureCanCreate(actorRole, request.Role);

        var login = request.Login.Trim();
        var exists = await _context.AdminUsers
            .AnyAsync(u => u.Login == login, cancellationToken);

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

        _context.AdminUsers.Add(user);
        await _context.SaveChangesAsync(cancellationToken);

        return AdminUserMapping.ToDto(user, now);
    }
}
