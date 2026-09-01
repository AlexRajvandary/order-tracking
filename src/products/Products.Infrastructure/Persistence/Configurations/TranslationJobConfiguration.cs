using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Products.Domain.Entities;

namespace Products.Infrastructure.Persistence.Configurations;

public sealed class TranslationJobConfiguration : IEntityTypeConfiguration<TranslationJob>
{
    public void Configure(EntityTypeBuilder<TranslationJob> builder)
    {
        builder.ToTable("translation_jobs");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Scope).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(x => x.Model).HasMaxLength(100).IsRequired();
        builder.Property(x => x.PromptVersion).HasMaxLength(32);
        builder.Property(x => x.LastError).HasMaxLength(4000);

        builder.HasMany(x => x.Items)
            .WithOne(x => x.Job)
            .HasForeignKey(x => x.JobId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(x => x.Batches)
            .WithOne(x => x.Job)
            .HasForeignKey(x => x.JobId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.Status, x.CreatedAt });
    }
}

public sealed class TranslationJobItemConfiguration : IEntityTypeConfiguration<TranslationJobItem>
{
    public void Configure(EntityTypeBuilder<TranslationJobItem> builder)
    {
        builder.ToTable("translation_job_items");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(24).IsRequired();
        builder.Property(x => x.OriginalName).HasMaxLength(500);
        builder.Property(x => x.TranslatedName).HasMaxLength(500);
        builder.Property(x => x.LastError).HasMaxLength(4000);

        builder.HasIndex(x => new { x.JobId, x.ProductId }).IsUnique();
        builder.HasIndex(x => new { x.JobId, x.Status });
        builder.HasIndex(x => x.ProductId);

        builder.HasOne(x => x.Batch)
            .WithMany()
            .HasForeignKey(x => x.BatchId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => x.BatchId);
    }
}

public sealed class TranslationJobBatchConfiguration : IEntityTypeConfiguration<TranslationJobBatch>
{
    public void Configure(EntityTypeBuilder<TranslationJobBatch> builder)
    {
        builder.ToTable("translation_job_batches");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(24).IsRequired();
        builder.Property(x => x.OpenAiRequestId).HasMaxLength(200);
        builder.Property(x => x.Error).HasMaxLength(4000);

        builder.HasIndex(x => new { x.JobId, x.BatchNumber }).IsUnique();
        builder.HasIndex(x => new { x.JobId, x.Status });
    }
}
