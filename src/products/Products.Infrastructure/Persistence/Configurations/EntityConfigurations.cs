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

        builder.HasIndex(x => x.BrandId);

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
