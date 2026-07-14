using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Infrastructure.Identity;
using OrderTracking.Infrastructure.Persistence.Seed;

namespace OrderTracking.Infrastructure.Persistence;

public static class DatabaseInitializer
{
    public static async Task InitialiseAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        using var scope = services.CreateScope();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<ApplicationDbContext>>();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var configuration = scope.ServiceProvider.GetRequiredService<Microsoft.Extensions.Configuration.IConfiguration>();
        var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

        try
        {
            logger.LogInformation("Applying database migrations...");
            await context.Database.MigrateAsync(cancellationToken);
            logger.LogInformation("Database migrations applied");

            await StatusDefinitionSeeder.SeedAsync(context, logger, cancellationToken);
            await AdminUserSeeder.SeedAsync(context, passwordHasher, configuration, logger, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred while initialising the database");
            throw;
        }
    }
}
