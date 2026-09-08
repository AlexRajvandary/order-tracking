using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Products.Domain.Entities;

namespace Products.Infrastructure.Persistence.Configurations;

public sealed class ImageImportJobConfiguration : IEntityTypeConfiguration<ImageImportJob>
{
    public void Configure(EntityTypeBuilder<ImageImportJob> builder)
    {
        builder.ToTable("image_import_jobs");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Scope).HasConversion<string>().HasMaxLength(32);
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(32);
        builder.Property(x => x.LastError).HasColumnType("text");
        builder.HasIndex(x => new { x.Status, x.CreatedAt });
        builder.HasMany(x => x.Items).WithOne(x => x.Job).HasForeignKey(x => x.JobId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class ImageImportJobItemConfiguration : IEntityTypeConfiguration<ImageImportJobItem>
{
    public void Configure(EntityTypeBuilder<ImageImportJobItem> builder)
    {
        builder.ToTable("image_import_job_items");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Error).HasColumnType("text");
        builder.HasIndex(x => new { x.JobId, x.ProductId }).IsUnique();
        builder.HasIndex(x => new { x.JobId, x.Completed, x.Failed });
        builder.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
    }
}
