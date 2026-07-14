using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Domain.Entities;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Infrastructure.Persistence.Seed;

public static class AdminUserSeeder
{
    public static async Task SeedAsync(
        ApplicationDbContext context,
        IPasswordHasher passwordHasher,
        IConfiguration configuration,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        if (await context.AdminUsers.AnyAsync(cancellationToken))
        {
            logger.LogDebug("Admin users already seeded, skipping");
            return;
        }

        var login = configuration["Seed:AdminLogin"] ?? "admin";
        var password = configuration["Seed:AdminPassword"] ?? "admin";

        var user = new AdminUser
        {
            Id = Guid.NewGuid(),
            Login = login,
            DisplayName = "Administrator",
            Role = AdminRole.SuperAdmin,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        user.PasswordHash = passwordHasher.Hash(user, password);

        context.AdminUsers.Add(user);
        await context.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Seeded default admin user with login '{Login}'", login);
    }
}
