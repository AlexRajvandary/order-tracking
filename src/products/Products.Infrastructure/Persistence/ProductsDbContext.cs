using Microsoft.EntityFrameworkCore;
using Products.Domain.Entities;

namespace Products.Infrastructure.Persistence;

public sealed class ProductsDbContext(DbContextOptions<ProductsDbContext> options) : DbContext(options)
{
    public DbSet<Brand> Brands => Set<Brand>();

    public DbSet<CatalogAnalyticsSnapshot> CatalogAnalyticsSnapshots => Set<CatalogAnalyticsSnapshot>();

    public DbSet<CatalogCartItem> CatalogCartItems => Set<CatalogCartItem>();

    public DbSet<CatalogFavorite> CatalogFavorites => Set<CatalogFavorite>();

    public DbSet<Category> Categories => Set<Category>();

    public DbSet<CrawlerJobLog> CrawlerJobLogs => Set<CrawlerJobLog>();

    public DbSet<CrawlerJob> CrawlerJobs => Set<CrawlerJob>();

    public DbSet<ExternalProductCartItem> ExternalProductCartItems => Set<ExternalProductCartItem>();

    public DbSet<ImageImportJobItem> ImageImportJobItems => Set<ImageImportJobItem>();

    public DbSet<ImageImportJob> ImageImportJobs => Set<ImageImportJob>();

    public DbSet<LaptopSpecification> LaptopSpecifications => Set<LaptopSpecification>();

    public DbSet<OnePieceCharacterSpecification> OnePieceCharacterSpecifications => Set<OnePieceCharacterSpecification>();

    public DbSet<ProductAuditLog> ProductAuditLogs => Set<ProductAuditLog>();

    public DbSet<ProductColor> ProductColors => Set<ProductColor>();

    public DbSet<ProductImage> ProductImages => Set<ProductImage>();

    public DbSet<ProductMedia> ProductMedia => Set<ProductMedia>();

    public DbSet<Product> Products => Set<Product>();

    public DbSet<ProductSize> ProductSizes => Set<ProductSize>();

    public DbSet<ProductSourceDetail> ProductSourceDetails => Set<ProductSourceDetail>();

    public DbSet<ProductVariant> ProductVariants => Set<ProductVariant>();

    public DbSet<Shop> Shops => Set<Shop>();

    public DbSet<StorefrontAnnouncement> StorefrontAnnouncements => Set<StorefrontAnnouncement>();

    public DbSet<TcgCardCharacter> TcgCardCharacters => Set<TcgCardCharacter>();

    public DbSet<TcgCardSpecification> TcgCardSpecifications => Set<TcgCardSpecification>();

    public DbSet<TcgCharacter> TcgCharacters => Set<TcgCharacter>();

    public DbSet<TranslationJobBatch> TranslationJobBatches => Set<TranslationJobBatch>();

    public DbSet<TranslationJobItem> TranslationJobItems => Set<TranslationJobItem>();

    public DbSet<TranslationJob> TranslationJobs => Set<TranslationJob>();

    public DbSet<YuGiOhCardSpecification> YuGiOhCardSpecifications => Set<YuGiOhCardSpecification>();

    public DbSet<YuGiOhSet> YuGiOhSets => Set<YuGiOhSet>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ProductsDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}