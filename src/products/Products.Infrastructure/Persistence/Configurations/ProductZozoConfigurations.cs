using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Products.Domain.Entities;

namespace Products.Infrastructure.Persistence.Configurations;

public sealed class ProductColorConfiguration : IEntityTypeConfiguration<ProductColor>
{
    public void Configure(EntityTypeBuilder<ProductColor> builder)
    {
        builder.ToTable("product_colors");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.CreatedAt).IsRequired();
        builder.HasOne(x => x.Product).WithMany(x => x.ProductColors).HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(x => x.ProductId);
        builder.HasIndex(x => new { x.ProductId, x.ExternalId }).IsUnique().HasFilter("\"ExternalId\" IS NOT NULL");
    }
}

public sealed class ProductSizeConfiguration : IEntityTypeConfiguration<ProductSize>
{
    public void Configure(EntityTypeBuilder<ProductSize> builder)
    {
        builder.ToTable("product_sizes");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).HasMaxLength(100).IsRequired();
        builder.Property(x => x.ShortName).HasMaxLength(100);
        builder.Property(x => x.SpecificationsJson).HasColumnType("jsonb");
        builder.Property(x => x.CreatedAt).IsRequired();
        builder.HasOne(x => x.Product).WithMany(x => x.ProductSizes).HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(x => x.ProductId);
        builder.HasIndex(x => new { x.ProductId, x.ExternalId }).IsUnique().HasFilter("\"ExternalId\" IS NOT NULL");
    }
}

public sealed class ProductMediaConfiguration : IEntityTypeConfiguration<ProductMedia>
{
    public void Configure(EntityTypeBuilder<ProductMedia> builder)
    {
        builder.ToTable("product_media");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.MediaType).HasMaxLength(32).IsRequired();
        builder.Property(x => x.Url).HasMaxLength(2000).IsRequired();
        builder.Property(x => x.FileName).HasMaxLength(500);
        builder.Property(x => x.CreatedAt).IsRequired();
        builder.HasOne(x => x.Product).WithMany(x => x.ProductMedia).HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(x => x.ProductId);
    }
}

public sealed class ProductSourceDetailConfiguration : IEntityTypeConfiguration<ProductSourceDetail>
{
    public void Configure(EntityTypeBuilder<ProductSourceDetail> builder)
    {
        builder.ToTable("product_source_details");
        builder.HasKey(x => x.ProductId);
        builder.Property(x => x.Source).HasMaxLength(32).IsRequired();
        builder.Property(x => x.Material).HasColumnType("text");
        builder.Property(x => x.Availability).HasMaxLength(100);
        builder.Property(x => x.UpdatedAt).IsRequired();
        builder.HasOne(x => x.Product).WithOne(x => x.SourceDetail).HasForeignKey<ProductSourceDetail>(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(x => new { x.Source, x.ExternalGoodsId });
    }
}
