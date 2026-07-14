using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Admins;
using OrderTracking.Application.Admins.Models;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Domain.Entities;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Application.Admins.CreateAdmin;

public sealed class CreateAdminCommandHandler : IRequestHandler<CreateAdminCommand, AdminUserDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IDateTimeProvider _clock;

    public CreateAdminCommandHandler(
        IApplicationDbContext context,
        IPasswordHasher passwordHasher,
        IDateTimeProvider clock)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _clock = clock;
    }

    public async Task<AdminUserDto> Handle(CreateAdminCommand request, CancellationToken cancellationToken)
    {
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
            Role = AdminRole.Admin,
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
