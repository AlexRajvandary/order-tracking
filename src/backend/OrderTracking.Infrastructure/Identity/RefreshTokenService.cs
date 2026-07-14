using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Domain.Entities;
using OrderTracking.Infrastructure.Persistence;

namespace OrderTracking.Infrastructure.Identity;

public sealed class RefreshTokenService : IRefreshTokenService
{
    private readonly ApplicationDbContext _context;
    private readonly JwtSettings _settings;
    private readonly IDateTimeProvider _dateTimeProvider;

    public RefreshTokenService(
        ApplicationDbContext context,
        IOptions<JwtSettings> settings,
        IDateTimeProvider dateTimeProvider)
    {
        _context = context;
        _settings = settings.Value;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task<(string RawToken, RefreshToken Entity)> CreateAsync(
        AdminUser user,
        string? ipAddress,
        string? userAgent,
        CancellationToken cancellationToken = default)
    {
        var rawToken = GenerateRawToken();
        var entity = new RefreshToken
        {
            Id = Guid.NewGuid(),
            AdminUserId = user.Id,
            TokenHash = HashToken(rawToken),
            ExpiresAt = _dateTimeProvider.UtcNow.AddDays(_settings.RefreshExpiryDays),
            CreatedAt = _dateTimeProvider.UtcNow,
            CreatedByIp = ipAddress,
            UserAgent = userAgent,
        };

        _context.RefreshTokens.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        return (rawToken, entity);
    }

    public async Task<(string RawToken, RefreshToken Entity, AdminUser User)?> RotateAsync(
        string rawToken,
        string? ipAddress,
        string? userAgent,
        CancellationToken cancellationToken = default)
    {
        var tokenHash = HashToken(rawToken);
        var existing = await _context.RefreshTokens
            .Include(t => t.AdminUser)
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash, cancellationToken);

        if (existing is null ||
            existing.RevokedAt is not null ||
            existing.ExpiresAt <= _dateTimeProvider.UtcNow ||
            !existing.AdminUser.IsActive)
        {
            return null;
        }

        existing.RevokedAt = _dateTimeProvider.UtcNow;

        var (newRawToken, newEntity) = await CreateAsync(
            existing.AdminUser,
            ipAddress,
            userAgent,
            cancellationToken);

        existing.ReplacedByTokenId = newEntity.Id;
        await _context.SaveChangesAsync(cancellationToken);

        return (newRawToken, newEntity, existing.AdminUser);
    }

    public async Task RevokeAsync(string rawToken, CancellationToken cancellationToken = default)
    {
        var tokenHash = HashToken(rawToken);
        var existing = await _context.RefreshTokens
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash, cancellationToken);

        if (existing is null || existing.RevokedAt is not null)
        {
            return;
        }

        existing.RevokedAt = _dateTimeProvider.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task RevokeAllForUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var now = _dateTimeProvider.UtcNow;
        var tokens = await _context.RefreshTokens
            .Where(t => t.AdminUserId == userId && t.RevokedAt == null)
            .ToListAsync(cancellationToken);

        foreach (var token in tokens)
        {
            token.RevokedAt = now;
        }

        if (tokens.Count > 0)
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
    }

    private static string GenerateRawToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes);
    }

    private static string HashToken(string rawToken)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(rawToken));
        return Convert.ToHexString(hash);
    }
}
