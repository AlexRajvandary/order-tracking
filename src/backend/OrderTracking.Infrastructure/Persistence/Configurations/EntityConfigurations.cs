using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OrderTracking.Domain.Common;
using OrderTracking.Domain.Entities;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Infrastructure.Persistence.Configurations;

public class AdminUserConfiguration : IEntityTypeConfiguration<AdminUser>
{
    public void Configure(EntityTypeBuilder<AdminUser> builder)
    {
        builder.ToTable("admin_users");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.Login).HasMaxLength(100).IsRequired();
        builder.Property(e => e.Email).HasMaxLength(256);
        builder.Property(e => e.PasswordHash).HasMaxLength(512).IsRequired();
        builder.Property(e => e.DisplayName).HasMaxLength(200);
        builder.Property(e => e.TelegramUsername).HasMaxLength(100);
        builder.Property(e => e.TelegramAvatarUrl).HasMaxLength(512);
        builder.Property(e => e.Role).HasConversion<string>().HasMaxLength(50);
        builder.Property(e => e.SettingsJson)
            .HasColumnType("jsonb")
            .HasColumnName("settings")
            .HasDefaultValueSql("'{}'::jsonb")
            .IsRequired();

        builder.HasIndex(e => e.Login)
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");

        builder.HasIndex(e => e.TelegramId)
            .IsUnique()
            .HasFilter("\"TelegramId\" IS NOT NULL AND \"IsDeleted\" = false");

        builder.HasQueryFilter(e => !e.IsDeleted);
    }
}

public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.ToTable("refresh_tokens");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.TokenHash).HasMaxLength(512).IsRequired();
        builder.Property(e => e.CreatedByIp).HasMaxLength(45);
        builder.Property(e => e.UserAgent).HasColumnType("text");

        builder.HasIndex(e => e.TokenHash).IsUnique();
        builder.HasIndex(e => e.AdminUserId)
            .HasFilter("\"RevokedAt\" IS NULL");

        builder.HasOne(e => e.AdminUser)
            .WithMany(u => u.RefreshTokens)
            .HasForeignKey(e => e.AdminUserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.ReplacedByToken)
            .WithMany()
            .HasForeignKey(e => e.ReplacedByTokenId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

public class CustomerConfiguration : IEntityTypeConfiguration<Customer>
{
    public void Configure(EntityTypeBuilder<Customer> builder)
    {
        builder.ToTable("customers");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.LastName).HasMaxLength(300);
        builder.Property(e => e.FirstName).HasMaxLength(100);
        builder.Property(e => e.Patronymic).HasMaxLength(100);
        builder.Property(e => e.Telegram).HasMaxLength(100);
        builder.Property(e => e.Phone).HasMaxLength(30);
        builder.Property(e => e.WhatsApp).HasMaxLength(100);
        builder.Property(e => e.Vk).HasMaxLength(200);
        builder.Property(e => e.Email).HasMaxLength(256);
        builder.Property(e => e.Notes).HasColumnType("text");

        builder.HasIndex(e => e.Phone)
            .HasFilter("\"IsDeleted\" = false");

        builder.HasIndex(e => e.Telegram)
            .HasFilter("\"IsDeleted\" = false");

        builder.HasIndex(e => e.LastName)
            .HasFilter("\"IsDeleted\" = false");

        builder.HasIndex(e => e.FirstName)
            .HasFilter("\"IsDeleted\" = false");

        builder.HasQueryFilter(e => !e.IsDeleted);
    }
}

public class CustomerAddressConfiguration : IEntityTypeConfiguration<CustomerAddress>
{
    public void Configure(EntityTypeBuilder<CustomerAddress> builder)
    {
        builder.ToTable("customer_addresses");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.City).HasMaxLength(200);
        builder.Property(e => e.Street).HasMaxLength(300);
        builder.Property(e => e.Building).HasMaxLength(50);
        builder.Property(e => e.Apartment).HasMaxLength(50);
        builder.Property(e => e.PostalCode).HasMaxLength(20);
        builder.Property(e => e.Note).HasColumnType("text");

        builder.HasIndex(e => e.CustomerId)
            .HasFilter("\"IsDeleted\" = false");

        builder.HasOne(e => e.Customer)
            .WithMany(c => c.Addresses)
            .HasForeignKey(e => e.CustomerId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasQueryFilter(e => !e.IsDeleted);
    }
}

public class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.ToTable("orders");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.TrackingCode)
            .HasMaxLength(5)
            .IsFixedLength()
            .IsRequired();

        builder.Property(e => e.AdminNotes).HasColumnType("text");
        builder.Property(e => e.DeliveryCity).HasMaxLength(200);
        builder.Property(e => e.DeliveryStreet).HasMaxLength(300);
        builder.Property(e => e.DeliveryBuilding).HasMaxLength(50);
        builder.Property(e => e.DeliveryApartment).HasMaxLength(50);
        builder.Property(e => e.DeliveryPostalCode).HasMaxLength(20);
        builder.Property(e => e.DeliveryNote).HasColumnType("text");

        builder.Property(e => e.Status)
            .HasConversion<string>()
            .HasMaxLength(32);

        builder.HasIndex(e => e.TrackingCode)
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");

        builder.HasIndex(e => e.CustomerId)
            .HasFilter("\"IsDeleted\" = false");

        builder.HasIndex(e => e.DeliveryAddressId)
            .HasFilter("\"IsDeleted\" = false");

        builder.HasIndex(e => e.UpdatedAt)
            .HasFilter("\"IsDeleted\" = false");

        builder.HasIndex(e => e.CreatedAt)
            .HasFilter("\"IsDeleted\" = false");

        builder.HasOne(e => e.Customer)
            .WithMany(c => c.Orders)
            .HasForeignKey(e => e.CustomerId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(e => e.DeliveryAddress)
            .WithMany(a => a.Orders)
            .HasForeignKey(e => e.DeliveryAddressId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(e => e.CreatedByAdmin)
            .WithMany(u => u.CreatedOrders)
            .HasForeignKey(e => e.CreatedByAdminId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasQueryFilter(e => !e.IsDeleted);
    }
}

public class OrderItemConfiguration : IEntityTypeConfiguration<OrderItem>
{
    public void Configure(EntityTypeBuilder<OrderItem> builder)
    {
        builder.ToTable("order_items", table =>
            table.HasCheckConstraint(
                "CK_order_items_price_currency",
                """
                ("UnitPrice" IS NULL AND "CurrencyCode" IS NULL)
                OR (
                    "UnitPrice" IS NOT NULL
                    AND "UnitPrice" >= 0
                    AND "CurrencyCode" IN ('RUB', 'USD', 'EUR', 'GBP', 'JPY')
                )
                """));

        builder.HasKey(e => e.Id);

        builder.Property(e => e.ItemType).HasConversion<string>().HasMaxLength(20);
        builder.Property(e => e.Name).HasMaxLength(500).IsRequired();
        builder.Property(e => e.Description).HasColumnType("text");
        builder.Property(e => e.SourceUrl).HasMaxLength(2000);
        builder.Property(e => e.UnitPrice).HasPrecision(18, 2);
        builder.Property(e => e.CurrencyCode).HasMaxLength(3).IsFixedLength();
        builder.Property(e => e.CurrentStatusText).HasMaxLength(200);

        builder.HasIndex(e => e.OrderId)
            .HasFilter("\"IsDeleted\" = false");

        builder.HasOne(e => e.Order)
            .WithMany(o => o.Items)
            .HasForeignKey(e => e.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.CurrentStatus)
            .WithMany(s => s.OrderItems)
            .HasForeignKey(e => e.CurrentStatusId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasQueryFilter(e => !e.IsDeleted);
    }
}

public class StatusDefinitionConfiguration : IEntityTypeConfiguration<StatusDefinition>
{
    public void Configure(EntityTypeBuilder<StatusDefinition> builder)
    {
        builder.ToTable("status_definitions");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.Name).HasMaxLength(200).IsRequired();
        builder.Property(e => e.ItemType).HasConversion<string>().HasMaxLength(20);
        builder.Property(e => e.Color).HasMaxLength(20);
        builder.Property(e => e.DefaultCountry).HasMaxLength(100);
        builder.Property(e => e.DefaultLocation).HasMaxLength(500);
        builder.Property(e => e.PublishAfterDays);

        builder.HasQueryFilter(e => !e.IsDeleted);
    }
}

public class OrderItemStatusHistoryConfiguration : IEntityTypeConfiguration<OrderItemStatusHistory>
{
    public void Configure(EntityTypeBuilder<OrderItemStatusHistory> builder)
    {
        builder.ToTable("order_item_status_history");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.StatusText).HasMaxLength(200).IsRequired();
        builder.Property(e => e.Comment).HasColumnType("text");
        builder.Property(e => e.Country).HasMaxLength(100);
        builder.Property(e => e.Location).HasMaxLength(500);
        builder.Property(e => e.IsPublished).HasDefaultValue(true);

        builder.HasIndex(e => new { e.OrderItemId, e.ChangedAt });
        builder.HasIndex(e => new { e.IsPublished, e.PublishAt });

        builder.HasOne(e => e.OrderItem)
            .WithMany(i => i.StatusHistory)
            .HasForeignKey(e => e.OrderItemId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.StatusDefinition)
            .WithMany(s => s.StatusHistory)
            .HasForeignKey(e => e.StatusDefinitionId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(e => e.ChangedByAdmin)
            .WithMany(u => u.StatusChanges)
            .HasForeignKey(e => e.ChangedByAdminId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasQueryFilter(e => !e.IsDeleted);
    }
}

public class OrderItemStatusAttachmentConfiguration : IEntityTypeConfiguration<OrderItemStatusAttachment>
{
    public void Configure(EntityTypeBuilder<OrderItemStatusAttachment> builder)
    {
        builder.ToTable("order_item_status_attachments");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.ObjectKey).HasMaxLength(500).IsRequired();
        builder.Property(e => e.ContentType).HasMaxLength(100).IsRequired();
        builder.Property(e => e.OriginalFileName).HasMaxLength(260);

        builder.HasIndex(e => e.StatusHistoryId);
        builder.HasIndex(e => e.ObjectKey).IsUnique();
        builder.HasIndex(e => e.UploadedByAdminId);

        builder.HasOne(e => e.StatusHistory)
            .WithMany(h => h.Attachments)
            .HasForeignKey(e => e.StatusHistoryId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.UploadedByAdmin)
            .WithMany()
            .HasForeignKey(e => e.UploadedByAdminId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class AuditLogEntryConfiguration : IEntityTypeConfiguration<AuditLogEntry>
{
    public void Configure(EntityTypeBuilder<AuditLogEntry> builder)
    {
        builder.ToTable("audit_log");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.EntityType).HasMaxLength(100).IsRequired();
        builder.Property(e => e.Action).HasMaxLength(50).IsRequired();
        builder.Property(e => e.OldValues).HasColumnType("jsonb");
        builder.Property(e => e.NewValues).HasColumnType("jsonb");
        builder.Property(e => e.IpAddress).HasMaxLength(45);
        builder.Property(e => e.UserAgent).HasColumnType("text");
        builder.Property(e => e.CorrelationId).HasMaxLength(100);

        builder.HasIndex(e => new { e.EntityType, e.EntityId });
        builder.HasIndex(e => e.CreatedAt);

        builder.HasOne(e => e.AdminUser)
            .WithMany(u => u.AuditLogs)
            .HasForeignKey(e => e.AdminUserId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
