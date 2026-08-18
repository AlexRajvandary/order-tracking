using Microsoft.EntityFrameworkCore;
using Products.Domain.Entities;

namespace Products.Infrastructure.Persistence;

public sealed class ProductsDbContext : DbContext
{
    public ProductsDbContext(DbContextOptions<ProductsDbContext> options) : base(options)
    {
    }

    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductAuditLog> ProductAuditLogs => Set<ProductAuditLog>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Brand> Brands => Set<Brand>();
    public DbSet<Shop> Shops => Set<Shop>();
    public DbSet<CrawlerJob> CrawlerJobs => Set<CrawlerJob>();
    public DbSet<CrawlerJobLog> CrawlerJobLogs => Set<CrawlerJobLog>();
    public DbSet<StorefrontAnnouncement> StorefrontAnnouncements => Set<StorefrontAnnouncement>();
    public DbSet<CatalogCartItem> CatalogCartItems => Set<CatalogCartItem>();
    public DbSet<CatalogFavorite> CatalogFavorites => Set<CatalogFavorite>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ProductsDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
