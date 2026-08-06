using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Products.Domain.Entities;

namespace Products.Infrastructure.Persistence;

public static class ShopSeeder
{
    private static readonly (string Name, string Slug, string? Website)[] Defaults =
    [
        ("Mercari", "mercari", "https://jp.mercari.com"),
        ("Yahoo! Auctions", "yahoo-auctions", "https://auctions.yahoo.co.jp"),
        ("Rakuten", "rakuten", "https://www.rakuten.co.jp"),
        ("Amazon Japan", "amazon-jp", "https://www.amazon.co.jp"),
        ("Lamoda", "lamoda", "https://www.lamoda.ru"),
        ("Suruga-ya", "suruga-ya", "https://www.suruga-ya.jp"),
        ("Mandarake", "mandarake", "https://www.mandarake.co.jp"),
    ];

    private static readonly Dictionary<string, (string Name, string Slug)> HostMap = new(StringComparer.OrdinalIgnoreCase)
    {
        ["jp.mercari.com"] = ("Mercari", "mercari"),
        ["www.mercari.com"] = ("Mercari", "mercari"),
        ["auctions.yahoo.co.jp"] = ("Yahoo! Auctions", "yahoo-auctions"),
        ["page.auctions.yahoo.co.jp"] = ("Yahoo! Auctions", "yahoo-auctions"),
        ["www.rakuten.co.jp"] = ("Rakuten", "rakuten"),
        ["item.rakuten.co.jp"] = ("Rakuten", "rakuten"),
        ["www.amazon.co.jp"] = ("Amazon Japan", "amazon-jp"),
        ["www.lamoda.ru"] = ("Lamoda", "lamoda"),
        ["a.lmcdn.ru"] = ("Lamoda", "lamoda"),
        ["www.suruga-ya.jp"] = ("Suruga-ya", "suruga-ya"),
        ["www.mandarake.co.jp"] = ("Mandarake", "mandarake"),
    };

    public static async Task SeedAsync(
        ProductsDbContext db,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        var existing = await db.Shops
            .IgnoreQueryFilters()
            .Where(s => !s.IsDeleted)
            .ToListAsync(cancellationToken);

        var bySlug = existing.ToDictionary(s => s.Slug, StringComparer.OrdinalIgnoreCase);
        var now = DateTimeOffset.UtcNow;
        var sort = existing.Count == 0 ? 0 : existing.Max(s => s.SortOrder);
        var created = 0;

        void EnsureShop(string name, string slug, string? website)
        {
            if (bySlug.ContainsKey(slug)) return;
            sort += 1;
            var shop = new Shop
            {
                Id = Guid.NewGuid(),
                Name = name,
                Slug = slug,
                WebsiteUrl = website,
                SortOrder = sort,
                IsActive = true,
                CreatedAt = now,
            };
            db.Shops.Add(shop);
            bySlug[slug] = shop;
            created += 1;
        }

        foreach (var (name, slug, website) in Defaults)
            EnsureShop(name, slug, website);

        var sourceUrls = await db.Products
            .IgnoreQueryFilters()
            .Where(p => !p.IsDeleted && p.SourceUrl != null && p.SourceUrl != "")
            .Select(p => p.SourceUrl!)
            .Distinct()
            .ToListAsync(cancellationToken);

        foreach (var url in sourceUrls)
        {
            if (!TryResolveShop(url, out var name, out var slug, out var website))
                continue;
            EnsureShop(name, slug, website);
        }

        if (created > 0)
            await db.SaveChangesAsync(cancellationToken);

        // Link products by SourceUrl host
        var shops = await db.Shops.Where(s => s.IsActive).ToListAsync(cancellationToken);
        var shopBySlug = shops.ToDictionary(s => s.Slug, StringComparer.OrdinalIgnoreCase);

        var products = await db.Products
            .Where(p => p.ShopId == null && p.SourceUrl != null && p.SourceUrl != "")
            .ToListAsync(cancellationToken);

        var linked = 0;
        foreach (var product in products)
        {
            if (!TryResolveShop(product.SourceUrl!, out _, out var slug, out _))
                continue;
            if (!shopBySlug.TryGetValue(slug, out var shop))
                continue;
            product.ShopId = shop.Id;
            linked += 1;
        }

        // Bags without SourceUrl → Lamoda (legacy import)
        if (shopBySlug.TryGetValue("lamoda", out var lamoda))
        {
            var orphanBags = await db.Products
                .Where(p => p.ShopId == null && (p.SourceUrl == null || p.SourceUrl == ""))
                .ToListAsync(cancellationToken);
            foreach (var product in orphanBags)
            {
                product.ShopId = lamoda.Id;
                linked += 1;
            }
        }

        if (linked > 0)
            await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Shop seed: created {Created}, linked {Linked} products", created, linked);
    }

    private static bool TryResolveShop(
        string sourceUrl,
        out string name,
        out string slug,
        out string? website)
    {
        name = "";
        slug = "";
        website = null;

        if (!Uri.TryCreate(sourceUrl, UriKind.Absolute, out var uri))
            return false;

        var host = uri.Host.ToLowerInvariant();
        if (host.StartsWith("www.", StringComparison.Ordinal))
            host = host[4..];

        if (HostMap.TryGetValue(uri.Host, out var mapped) || HostMap.TryGetValue(host, out mapped))
        {
            name = mapped.Name;
            slug = mapped.Slug;
            website = $"{uri.Scheme}://{uri.Host}";
            return true;
        }

        // Fallback: use host as shop name
        name = host;
        slug = BrandSeeder.Slugify(host);
        if (string.IsNullOrWhiteSpace(slug))
            return false;
        website = $"{uri.Scheme}://{uri.Host}";
        return true;
    }
}
