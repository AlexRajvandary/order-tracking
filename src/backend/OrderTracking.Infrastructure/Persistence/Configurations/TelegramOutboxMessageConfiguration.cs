using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OrderTracking.Domain.Entities;

namespace OrderTracking.Infrastructure.Persistence.Configurations;

public class TelegramOutboxMessageConfiguration : IEntityTypeConfiguration<TelegramOutboxMessage>
{
    public void Configure(EntityTypeBuilder<TelegramOutboxMessage> builder)
    {
        builder.ToTable("telegram_outbox_messages");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.Kind).HasMaxLength(64).IsRequired();
        builder.Property(e => e.PayloadJson).HasColumnType("jsonb").IsRequired();
        builder.Property(e => e.Status).HasConversion<short>();
        builder.Property(e => e.DedupKey).HasMaxLength(128);
        builder.Property(e => e.LastError).HasMaxLength(2000);

        builder.HasIndex(e => new { e.Status, e.CreatedAt });
        builder.HasIndex(e => e.DedupKey)
            .IsUnique()
            .HasFilter("\"DedupKey\" IS NOT NULL AND \"Status\" IN (0, 1)");
    }
}
