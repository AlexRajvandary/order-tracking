using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Products.Application.Common.Interfaces;
using Products.Domain.Entities;

namespace Products.Infrastructure.Persistence;

public sealed class ProductAuditWriter : IProductAuditWriter
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private readonly ProductsDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IDateTimeProvider _clock;

    public ProductAuditWriter(
        ProductsDbContext db,
        ICurrentUserService currentUser,
        IDateTimeProvider clock)
    {
        _db = db;
        _currentUser = currentUser;
        _clock = clock;
    }

    public Task WriteAsync(
        Guid productId,
        string action,
        Product? oldValues,
        Product? newValues,
        CancellationToken cancellationToken = default)
    {
        var entry = new ProductAuditLog
        {
            Id = Guid.NewGuid(),
            ProductId = productId,
            Action = action,
            ActorAdminId = _currentUser.AdminId,
            ActorLogin = _currentUser.Login,
            OldValues = oldValues is null ? null : JsonSerializer.Serialize(ToSnapshot(oldValues), JsonOptions),
            NewValues = newValues is null ? null : JsonSerializer.Serialize(ToSnapshot(newValues), JsonOptions),
            CreatedAt = _clock.UtcNow,
        };

        _db.ProductAuditLogs.Add(entry);
        return Task.CompletedTask;
    }

    public async Task<(IReadOnlyList<ProductAuditLog> Items, int Total)> GetByProductAsync(
        Guid productId,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = _db.ProductAuditLogs.Where(a => a.ProductId == productId);
        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);
        return (items, total);
    }

    private static object ToSnapshot(Product p) => new
    {
        p.Id,
        p.Name,
        p.Slug,
        p.Description,
        p.Sku,
        p.Brand,
        p.Price,
        p.CurrencyCode,
        p.OriginalPrice,
        p.OriginalCurrencyCode,
        p.ImageUrl,
        p.SourceUrl,
        p.IsActive,
    };
}
