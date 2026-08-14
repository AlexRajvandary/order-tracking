using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Products.Domain.Entities;

namespace Products.Infrastructure.Persistence.Configurations;

public sealed class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.ToTable("products");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Name).HasMaxLength(500).IsRequired();
        builder.Property(x => x.Slug).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Description).HasColumnType("text");
        builder.Property(x => x.Sku).HasMaxLength(100);
        builder.Property(x => x.Brand).HasMaxLength(200);
        builder.Property(x => x.Condition)
            .HasConversion<string>()
            .HasMaxLength(16)
            .IsRequired();
        builder.Property(x => x.Price).HasPrecision(18, 2);
        builder.Property(x => x.CurrencyCode).HasMaxLength(3).IsFixedLength().IsRequired();
        builder.Property(x => x.OriginalPrice).HasPrecision(18, 2);
        builder.Property(x => x.OriginalCurrencyCode).HasMaxLength(3).IsFixedLength();
        builder.Property(x => x.ImageUrl).HasMaxLength(2000).IsRequired();
        builder.Property(x => x.SourceUrl).HasMaxLength(2000);

        builder.HasOne(x => x.BrandEntity)
            .WithMany(x => x.Products)
            .HasForeignKey(x => x.BrandId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(x => x.Shop)
            .WithMany(x => x.Products)
            .HasForeignKey(x => x.ShopId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(x => x.Category)
            .WithMany()
            .HasForeignKey(x => x.CategoryId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => x.BrandId);
        builder.HasIndex(x => x.ShopId);
        builder.HasIndex(x => x.CategoryId);
        builder.HasIndex(x => x.Condition);

        builder.HasIndex(x => x.Slug)
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");

        builder.HasIndex(x => x.Sku)
            .HasFilter("\"IsDeleted\" = false AND \"Sku\" IS NOT NULL");

        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}

public sealed class BrandConfiguration : IEntityTypeConfiguration<Brand>
{
    public void Configure(EntityTypeBuilder<Brand> builder)
    {
        builder.ToTable("brands");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Slug).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(1000);
        builder.Property(x => x.LogoUrl).HasMaxLength(2000);

        builder.HasIndex(x => x.Slug)
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");

        builder.HasIndex(x => x.Name)
            .HasFilter("\"IsDeleted\" = false");

        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}

public sealed class ShopConfiguration : IEntityTypeConfiguration<Shop>
{
    public void Configure(EntityTypeBuilder<Shop> builder)
    {
        builder.ToTable("shops");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Slug).HasMaxLength(200).IsRequired();
        builder.Property(x => x.WebsiteUrl).HasMaxLength(2000);
        builder.Property(x => x.Description).HasMaxLength(1000);

        builder.HasIndex(x => x.Slug)
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");

        builder.HasIndex(x => x.Name)
            .HasFilter("\"IsDeleted\" = false");

        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}

public sealed class ProductAuditLogConfiguration : IEntityTypeConfiguration<ProductAuditLog>
{
    public void Configure(EntityTypeBuilder<ProductAuditLog> builder)
    {
        builder.ToTable("product_audit_log");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Action).HasMaxLength(32).IsRequired();
        builder.Property(x => x.ActorLogin).HasMaxLength(100);
        builder.Property(x => x.OldValues).HasColumnType("jsonb");
        builder.Property(x => x.NewValues).HasColumnType("jsonb");

        builder.HasIndex(x => x.ProductId);
        builder.HasIndex(x => x.CreatedAt);
    }
}

public sealed class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> builder)
    {
        builder.ToTable("categories");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Slug).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(1000);
        builder.Property(x => x.ImageUrl).HasMaxLength(2000);

        builder.HasOne(x => x.Parent)
            .WithMany(x => x.Children)
            .HasForeignKey(x => x.ParentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.ParentId);
        builder.HasIndex(x => new { x.ParentId, x.Slug })
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");

        builder.HasIndex(x => x.IsPopular)
            .HasFilter("\"IsDeleted\" = false AND \"IsPopular\" = true");

        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}

public sealed class CrawlerJobConfiguration : IEntityTypeConfiguration<CrawlerJob>
{
    public void Configure(EntityTypeBuilder<CrawlerJob> builder)
    {
        builder.ToTable("crawler_jobs");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Parser).HasMaxLength(32).IsRequired();
        builder.Property(x => x.Url).HasMaxLength(2000).IsRequired();
        builder.Property(x => x.CategoryPath).HasMaxLength(1000).IsRequired();
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(24).IsRequired();
        builder.Property(x => x.CreatedBy).HasMaxLength(100);
        builder.Property(x => x.LastError).HasMaxLength(4000);

        builder.HasOne(x => x.Category)
            .WithMany()
            .HasForeignKey(x => x.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(x => x.Logs)
            .WithOne(x => x.Job)
            .HasForeignKey(x => x.JobId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => x.CategoryId);
        builder.HasIndex(x => new { x.Status, x.CreatedAt });
        builder.HasIndex(x => x.HeartbeatAt);
        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}

public sealed class CrawlerJobLogConfiguration : IEntityTypeConfiguration<CrawlerJobLog>
{
    public void Configure(EntityTypeBuilder<CrawlerJobLog> builder)
    {
        builder.ToTable("crawler_job_logs");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Level).HasMaxLength(16).IsRequired();
        builder.Property(x => x.Message).HasMaxLength(2000).IsRequired();
        builder.HasIndex(x => new { x.JobId, x.CreatedAt });
    }
}
