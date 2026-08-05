using System.Globalization;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Products.Domain.Entities;

namespace Products.Infrastructure.Persistence;

public static class BrandSeeder
{
    public static async Task SeedFromProductBrandNamesAsync(
        ProductsDbContext db,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        var names = await db.Products
            .IgnoreQueryFilters()
            .Where(p => !p.IsDeleted && p.Brand != null && p.Brand != "")
            .Select(p => p.Brand!)
            .Distinct()
            .ToListAsync(cancellationToken);

        if (names.Count == 0)
        {
            logger.LogInformation("No product brand names to seed");
            return;
        }

        var existing = await db.Brands
            .IgnoreQueryFilters()
            .Where(b => !b.IsDeleted)
            .ToListAsync(cancellationToken);

        var bySlug = existing.ToDictionary(b => b.Slug, StringComparer.OrdinalIgnoreCase);
        var byName = existing.ToDictionary(b => b.Name.Trim(), StringComparer.OrdinalIgnoreCase);
        var now = DateTimeOffset.UtcNow;
        var sort = existing.Count == 0 ? 0 : existing.Max(b => b.SortOrder);
        var created = 0;

        foreach (var raw in names.OrderBy(n => n, StringComparer.OrdinalIgnoreCase))
        {
            var name = raw.Trim();
            if (name.Length == 0) continue;
            if (byName.ContainsKey(name)) continue;

            var slug = Slugify(name);
            if (string.IsNullOrEmpty(slug))
                slug = $"brand-{Guid.NewGuid():N}"[..16];

            if (bySlug.ContainsKey(slug))
                slug = $"{slug}-{created + 1}";

            sort += 1;
            var brand = new Brand
            {
                Id = Guid.NewGuid(),
                Name = name,
                Slug = slug,
                SortOrder = sort,
                IsActive = true,
                CreatedAt = now,
            };
            db.Brands.Add(brand);
            bySlug[slug] = brand;
            byName[name] = brand;
            created += 1;
        }

        if (created > 0)
            await db.SaveChangesAsync(cancellationToken);

        // Link products by denormalized Brand name
        var brands = await db.Brands
            .Where(b => b.IsActive)
            .ToListAsync(cancellationToken);
        var brandByName = brands.ToDictionary(b => b.Name.Trim(), StringComparer.OrdinalIgnoreCase);

        var products = await db.Products
            .Where(p => p.Brand != null && p.Brand != "" && p.BrandId == null)
            .ToListAsync(cancellationToken);

        var linked = 0;
        foreach (var product in products)
        {
            if (product.Brand is null) continue;
            if (!brandByName.TryGetValue(product.Brand.Trim(), out var brand)) continue;
            product.BrandId = brand.Id;
            linked += 1;
        }

        if (linked > 0)
            await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "Brand seed: created {Created}, linked {Linked} products (from {Names} distinct names)",
            created,
            linked,
            names.Count);
    }

    public static string Slugify(string value)
    {
        var normalized = value.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(normalized.Length);
        foreach (var ch in normalized)
        {
            var category = CharUnicodeInfo.GetUnicodeCategory(ch);
            if (category == UnicodeCategory.NonSpacingMark) continue;
            if (char.IsLetterOrDigit(ch))
            {
                sb.Append(ch);
                continue;
            }
            if (ch is ' ' or '-' or '_' or '.' or '&' or '/')
            {
                if (sb.Length > 0 && sb[^1] != '-') sb.Append('-');
            }
        }

        var slug = sb.ToString().Normalize(NormalizationForm.FormC).Trim('-');
        while (slug.Contains("--", StringComparison.Ordinal))
            slug = slug.Replace("--", "-", StringComparison.Ordinal);
        return slug;
    }
}
