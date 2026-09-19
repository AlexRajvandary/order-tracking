using System.Data;
using Microsoft.EntityFrameworkCore;
using Products.Infrastructure.Persistence;

namespace Products.Infrastructure.Services.Sitemap;

public interface ISitemapDataSource
{
    Task<IReadOnlyList<ProductSitemapEntry>> ReadProductBatchAsync(
        Guid? afterId,
        int batchSize,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<CategorySitemapEntry>> ReadCategoriesAsync(CancellationToken cancellationToken);
}

internal sealed class SitemapDataSource : ISitemapDataSource
{
    private readonly ProductsDbContext _db;

    public SitemapDataSource(ProductsDbContext db) => _db = db;

    public async Task<IReadOnlyList<ProductSitemapEntry>> ReadProductBatchAsync(
        Guid? afterId,
        int batchSize,
        CancellationToken cancellationToken)
    {
        var connection = _db.Database.GetDbConnection();
        if (connection.State != ConnectionState.Open)
            await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = afterId.HasValue
            ? """
              SELECT "Id", "Slug", COALESCE("UpdatedAt", "CreatedAt")
              FROM products
              WHERE NOT "IsDeleted"
                AND "IsActive"
                AND "Slug" <> ''
                AND "Id" > @last_id
              ORDER BY "Id"
              LIMIT @batch_size
              """
            : """
              SELECT "Id", "Slug", COALESCE("UpdatedAt", "CreatedAt")
              FROM products
              WHERE NOT "IsDeleted"
                AND "IsActive"
                AND "Slug" <> ''
              ORDER BY "Id"
              LIMIT @batch_size
              """;

        if (afterId.HasValue)
        {
            var lastId = command.CreateParameter();
            lastId.ParameterName = "last_id";
            lastId.Value = afterId.Value;
            command.Parameters.Add(lastId);
        }

        var take = command.CreateParameter();
        take.ParameterName = "batch_size";
        take.Value = batchSize;
        command.Parameters.Add(take);

        var result = new List<ProductSitemapEntry>(batchSize);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            result.Add(new ProductSitemapEntry(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.GetFieldValue<DateTimeOffset>(2)));
        }

        return result;
    }

    public async Task<IReadOnlyList<CategorySitemapEntry>> ReadCategoriesAsync(
        CancellationToken cancellationToken)
    {
        var categories = await _db.Categories
            .AsNoTracking()
            .Where(category => category.IsActive && category.Slug != string.Empty)
            .Select(category => new
            {
                category.Id,
                category.ParentId,
                category.Slug,
                LastModified = category.UpdatedAt ?? category.CreatedAt,
            })
            .ToListAsync(cancellationToken);

        var productCounts = await _db.Products
            .AsNoTracking()
            .Where(product => product.IsActive && product.CategoryId != null && product.Slug != string.Empty)
            .GroupBy(product => product.CategoryId!.Value)
            .Select(group => new { Id = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.Id, item => item.Count, cancellationToken);

        return categories
            .Select(category => new CategorySitemapEntry(
                category.Id,
                category.ParentId,
                category.Slug,
                category.LastModified,
                productCounts.GetValueOrDefault(category.Id)))
            .ToList();
    }
}
