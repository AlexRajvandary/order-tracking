using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Products.Infrastructure.Persistence.Configurations;

public sealed class CatalogAnalyticsSnapshotConfiguration : IEntityTypeConfiguration<CatalogAnalyticsSnapshot>
{
    public void Configure(EntityTypeBuilder<CatalogAnalyticsSnapshot> builder)
    {
        builder.ToTable("catalog_analytics_snapshots");
        builder.HasKey(snapshot => snapshot.Id);
        builder.Property(snapshot => snapshot.Payload).HasColumnType("jsonb").IsRequired();
        builder.Property(snapshot => snapshot.GeneratedAt).IsRequired();
    }
}
