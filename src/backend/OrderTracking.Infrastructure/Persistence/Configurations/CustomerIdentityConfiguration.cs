using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OrderTracking.Domain.Entities;

namespace OrderTracking.Infrastructure.Persistence.Configurations;

public sealed class CustomerEmailOtpConfiguration : IEntityTypeConfiguration<CustomerEmailOtp>
{
    public void Configure(EntityTypeBuilder<CustomerEmailOtp> builder)
    {
        builder.ToTable("customer_email_otps");
        builder.HasKey(item => item.Id);
        builder.Property(item => item.Email).HasMaxLength(256).IsRequired();
        builder.Property(item => item.Purpose).HasMaxLength(32).IsRequired();
        builder.Property(item => item.CodeHash).HasMaxLength(128).IsRequired();
        builder.Property(item => item.PasswordHash).HasMaxLength(512);
        builder.Property(item => item.DisplayName).HasMaxLength(200);
        builder.HasIndex(item => new { item.Email, item.Purpose, item.CreatedAt });
    }
}

public sealed class CustomerOrderClaimConfiguration : IEntityTypeConfiguration<CustomerOrderClaim>
{
    public void Configure(EntityTypeBuilder<CustomerOrderClaim> builder)
    {
        builder.ToTable("customer_order_claims");
        builder.HasKey(item => item.Id);
        builder.Property(item => item.TokenHash).HasMaxLength(64).IsRequired();
        builder.HasIndex(item => item.TokenHash).IsUnique();
        builder.HasIndex(item => item.OrderId).IsUnique();
        builder.HasOne<Order>().WithMany().HasForeignKey(item => item.OrderId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class CustomerTelegramLoginStateConfiguration : IEntityTypeConfiguration<CustomerTelegramLoginState>
{
    public void Configure(EntityTypeBuilder<CustomerTelegramLoginState> builder)
    {
        builder.ToTable("customer_telegram_login_states");
        builder.HasKey(item => item.Id);
        builder.Property(item => item.StateHash).HasMaxLength(64).IsRequired();
        builder.Property(item => item.Nonce).HasMaxLength(128).IsRequired();
        builder.Property(item => item.CodeVerifier).HasMaxLength(128).IsRequired();
        builder.Property(item => item.Purpose).HasMaxLength(16).IsRequired();
        builder.HasIndex(item => item.StateHash).IsUnique();
        builder.HasIndex(item => item.ExpiresAt);
    }
}
