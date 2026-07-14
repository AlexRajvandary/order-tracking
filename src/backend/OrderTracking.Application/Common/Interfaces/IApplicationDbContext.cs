using Microsoft.EntityFrameworkCore;
using OrderTracking.Domain.Entities;

namespace OrderTracking.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<AdminUser> AdminUsers { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<Customer> Customers { get; }
    DbSet<Order> Orders { get; }
    DbSet<OrderItem> OrderItems { get; }
    DbSet<StatusDefinition> StatusDefinitions { get; }
    DbSet<OrderItemStatusHistory> OrderItemStatusHistories { get; }
    DbSet<OrderItemStatusAttachment> OrderItemStatusAttachments { get; }
    DbSet<AuditLogEntry> AuditLogs { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
