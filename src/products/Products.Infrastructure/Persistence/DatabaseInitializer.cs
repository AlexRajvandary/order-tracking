using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Products.Infrastructure.Persistence;

namespace Products.Infrastructure.Persistence;

public static class DatabaseInitializer
{
    public static async Task InitialiseAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ProductsDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<ProductsDbContext>>();

        logger.LogInformation("Applying products database migrations...");
        await db.Database.MigrateAsync();
        logger.LogInformation("Products database migrations applied");

        await BrandSeeder.SeedFromProductBrandNamesAsync(db, logger);
    }
}
