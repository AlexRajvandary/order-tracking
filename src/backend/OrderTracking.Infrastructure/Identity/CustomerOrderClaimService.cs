using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Domain.Entities;
using OrderTracking.Infrastructure.Persistence;

namespace OrderTracking.Infrastructure.Identity;

public sealed class CustomerOrderClaimService(
    ApplicationDbContext db,
    ICustomerTelegramNotifier telegramNotifier,
    ILogger<CustomerOrderClaimService> logger) : ICustomerOrderClaimService
{
    public async Task<string> CreateAsync(Guid orderId, CancellationToken cancellationToken = default)
    {
        if (!await db.Orders.AnyAsync(order => order.Id == orderId, cancellationToken))
            throw new KeyNotFoundException($"Order '{orderId}' was not found.");

        var rawToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).TrimEnd('=').Replace('+', '-').Replace('/', '_');
        var tokenHash = Hash(rawToken);
        var existing = await db.CustomerOrderClaims.SingleOrDefaultAsync(item => item.OrderId == orderId, cancellationToken);
        var now = DateTimeOffset.UtcNow;
        if (existing is null)
        {
            db.CustomerOrderClaims.Add(new CustomerOrderClaim
            {
                Id = Guid.NewGuid(), OrderId = orderId, TokenHash = tokenHash,
                ExpiresAt = now.AddMinutes(30), CreatedAt = now,
            });
        }
        else if (existing.ClaimedAt is null)
        {
            existing.TokenHash = tokenHash;
            existing.ExpiresAt = now.AddMinutes(30);
            existing.CreatedAt = now;
        }
        else
        {
            throw new InvalidOperationException("An order can only be claimed once.");
        }

        await db.SaveChangesAsync(cancellationToken);
        return rawToken;
    }

    public async Task ClaimAsync(Guid userId, string token, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(token) || token.Length > 128)
            throw new UnauthorizedAccessException("Invalid or expired claim link.");

        var tokenHash = Hash(token);
        var claim = await db.CustomerOrderClaims.SingleOrDefaultAsync(item => item.TokenHash == tokenHash, cancellationToken);
        var now = DateTimeOffset.UtcNow;
        if (claim is null || claim.ExpiresAt <= now || claim.ClaimedAt is not null)
            throw new UnauthorizedAccessException("This claim link is invalid, expired, or already used.");

        var account = await db.AdminUsers.SingleOrDefaultAsync(user => user.Id == userId && user.Role == Domain.Enums.AdminRole.Buyer && user.IsActive, cancellationToken)
            ?? throw new UnauthorizedAccessException("Customer account not found.");
        var order = await db.Orders.Include(item => item.Customer)
            .SingleOrDefaultAsync(item => item.Id == claim.OrderId, cancellationToken)
            ?? throw new KeyNotFoundException("Order not found.");

        if (account.CustomerId is null)
        {
            if (order.CustomerId is null)
            {
                var customer = new Customer
                {
                    Id = Guid.NewGuid(), Email = account.Email, FirstName = account.DisplayName,
                    CreatedAt = now, UpdatedAt = now,
                };
                db.Customers.Add(customer);
                account.CustomerId = customer.Id;
            }
            else
            {
                account.CustomerId = order.CustomerId;
                if (order.Customer is { } customer && string.IsNullOrWhiteSpace(customer.Email))
                    customer.Email = account.Email;
            }
        }
        else if (order.Customer is { } sourceCustomer)
        {
            var targetCustomer = await db.Customers.SingleAsync(customer => customer.Id == account.CustomerId, cancellationToken);
            targetCustomer.FirstName ??= sourceCustomer.FirstName;
            targetCustomer.LastName ??= sourceCustomer.LastName;
            targetCustomer.Email ??= sourceCustomer.Email ?? account.Email;
            targetCustomer.Phone ??= sourceCustomer.Phone;
            targetCustomer.Telegram ??= sourceCustomer.Telegram;
            targetCustomer.WhatsApp ??= sourceCustomer.WhatsApp;
            targetCustomer.Vk ??= sourceCustomer.Vk;
        }

        order.CustomerId = account.CustomerId;
        claim.ClaimedAt = now;
        claim.ClaimedByUserId = userId;
        await db.SaveChangesAsync(cancellationToken);

        if (account.CustomerTelegramId is not null && account.CustomerNotificationsEnabled && !account.CustomerNotificationsDisabledByAdmin)
            await SendConfirmationAsync(claim, order.Id, account.CustomerTelegramId.Value, cancellationToken);
    }

    public async Task NotifyRecentlyClaimedOrdersAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var account = await db.AdminUsers.SingleOrDefaultAsync(user => user.Id == userId && user.Role == Domain.Enums.AdminRole.Buyer && user.IsActive, cancellationToken);
        if (account?.CustomerTelegramId is not { } telegramId || !account.CustomerNotificationsEnabled || account.CustomerNotificationsDisabledByAdmin) return;
        var cutoff = DateTimeOffset.UtcNow.AddMinutes(-30);
        var claims = await db.CustomerOrderClaims.Where(claim => claim.ClaimedByUserId == userId && claim.ClaimedAt >= cutoff && claim.TelegramNotifiedAt == null)
            .OrderBy(claim => claim.ClaimedAt).ToListAsync(cancellationToken);
        foreach (var claim in claims)
            await SendConfirmationAsync(claim, claim.OrderId, telegramId, cancellationToken);
    }

    private async Task SendConfirmationAsync(CustomerOrderClaim claim, Guid orderId, long telegramId, CancellationToken cancellationToken)
    {
        try
        {
            await telegramNotifier.SendOrderCreatedAsync(orderId, telegramId, cancellationToken);
            claim.TelegramNotifiedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Could not send customer order confirmation for order {OrderId}", orderId);
        }
    }

    private static string Hash(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
