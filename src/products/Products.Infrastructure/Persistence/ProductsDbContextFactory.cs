using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Products.Infrastructure.Persistence;

public sealed class ProductsDbContextFactory : IDesignTimeDbContextFactory<ProductsDbContext>
{
    public ProductsDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? "Host=localhost;Port=5434;Database=products;Username=products;Password=products";
        var options = new DbContextOptionsBuilder<ProductsDbContext>()
            .UseNpgsql(connectionString)
            .Options;
        return new ProductsDbContext(options);
    }
}
