using System.Globalization;
using System.Security.Cryptography;
using Microsoft.Data.Sqlite;
using ZozoEnrichmentTester.Models;

namespace ZozoEnrichmentTester.Services;

public sealed class ZozoDatabase
{
    private readonly string _connectionString;

    public ZozoDatabase(string databasePath)
    {
        var fullPath = Path.GetFullPath(databasePath);
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);
        _connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = fullPath,
            Mode = SqliteOpenMode.ReadWriteCreate,
            Cache = SqliteCacheMode.Shared,
        }.ToString();
        DatabasePath = fullPath;
    }

    public string DatabasePath { get; }

    public async Task InitializeAsync(CancellationToken cancellationToken)
    {
        await using var connection = await OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            PRAGMA journal_mode=WAL;
            PRAGMA synchronous=NORMAL;

            CREATE TABLE IF NOT EXISTS schema_info (
                version INTEGER NOT NULL
            );
            INSERT INTO schema_info(version)
            SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM schema_info);

            CREATE TABLE IF NOT EXISTS products (
                product_id TEXT PRIMARY KEY,
                source_url TEXT NOT NULL,
                name TEXT,
                brand TEXT,
                description TEXT,
                material TEXT,
                price INTEGER,
                original_price INTEGER,
                currency TEXT,
                photos_json TEXT,
                colors_json TEXT,
                sizes_json TEXT,
                size_specs_json TEXT,
                variants_json TEXT,
                movies_json TEXT,
                availability TEXT,
                goods_id INTEGER,
                goods_detail_id INTEGER,
                goods_type_id INTEGER,
                shop_id INTEGER,
                parse_status TEXT NOT NULL,
                error TEXT,
                first_seen_at TEXT NOT NULL,
                last_seen_at TEXT NOT NULL,
                last_attempt_at TEXT,
                parsed_at TEXT,
                attempts INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS imports (
                import_id INTEGER PRIMARY KEY AUTOINCREMENT,
                input_file TEXT NOT NULL,
                input_file_hash TEXT NOT NULL,
                started_at TEXT NOT NULL,
                finished_at TEXT,
                total_rows INTEGER NOT NULL,
                new_products INTEGER NOT NULL DEFAULT 0,
                already_completed INTEGER NOT NULL DEFAULT 0,
                processed INTEGER NOT NULL DEFAULT 0,
                succeeded INTEGER NOT NULL DEFAULT 0,
                failed INTEGER NOT NULL DEFAULT 0,
                blocked INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS import_products (
                import_id INTEGER NOT NULL,
                product_id TEXT NOT NULL,
                PRIMARY KEY(import_id, product_id),
                FOREIGN KEY(import_id) REFERENCES imports(import_id),
                FOREIGN KEY(product_id) REFERENCES products(product_id)
            );

            CREATE INDEX IF NOT EXISTS idx_products_status ON products(parse_status);
            CREATE INDEX IF NOT EXISTS idx_products_source_url ON products(source_url);
            CREATE INDEX IF NOT EXISTS idx_import_products_import ON import_products(import_id);
            """;
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<ImportRegistration> RegisterImportAsync(
        string inputPath,
        IReadOnlyList<InputProduct> rawRows,
        CancellationToken cancellationToken)
    {
        var unique = new Dictionary<string, InputProduct>(StringComparer.Ordinal);
        foreach (var row in rawRows) unique[row.Id] = row;
        var hash = Convert.ToHexString(SHA256.HashData(await File.ReadAllBytesAsync(inputPath, cancellationToken))).ToLowerInvariant();
        var now = DateTimeOffset.UtcNow.ToString("O");
        var newProducts = 0;
        var alreadyCompleted = 0;
        var urlChanges = new List<string>();
        var duplicateUrls = unique.Values.GroupBy(row => row.Url, StringComparer.Ordinal)
            .Where(group => group.Select(row => row.Id).Distinct(StringComparer.Ordinal).Count() > 1)
            .Select(group => group.Key).ToList();

        await using var connection = await OpenAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
        var importId = await InsertImportAsync(connection, transaction, inputPath, hash, rawRows.Count, now, cancellationToken);

        foreach (var row in unique.Values)
        {
            var existing = await GetIdentityAsync(connection, transaction, row.Id, cancellationToken);
            if (existing is null) newProducts++;
            else
            {
                if (existing.Value.Status == ParseStatus.Completed.ToString()) alreadyCompleted++;
                if (!string.Equals(existing.Value.Url, row.Url, StringComparison.Ordinal))
                    urlChanges.Add($"{row.Id}: {existing.Value.Url} -> {row.Url}{(existing.Value.Status == ParseStatus.Completed.ToString() ? " (Completed)" : "")}");
            }

            await UpsertIdentityAsync(connection, transaction, row, now, cancellationToken);
            await LinkImportAsync(connection, transaction, importId, row.Id, cancellationToken);
        }

        await UpdateImportRegistrationAsync(connection, transaction, importId, newProducts, alreadyCompleted, cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return new ImportRegistration(importId, rawRows.Count, unique.Count, newProducts, alreadyCompleted, urlChanges, duplicateUrls);
    }

    public async Task<List<ProcessingProduct>> GetImportWorkAsync(
        long importId,
        bool force,
        bool retryErrors,
        int? limit,
        CancellationToken cancellationToken)
    {
        var statuses = force
            ? null
            : retryErrors
                ? new[] { "Pending", "Processing", "Failed", "Blocked" }
                : new[] { "Pending", "Processing" };
        return await QueryWorkAsync(
            "JOIN import_products ip ON ip.product_id = p.product_id WHERE ip.import_id = $importId",
            command => command.Parameters.AddWithValue("$importId", importId),
            statuses,
            limit,
            cancellationToken);
    }

    public Task<List<ProcessingProduct>> GetResumeWorkAsync(bool retryErrors, int? limit, CancellationToken cancellationToken) =>
        QueryWorkAsync(
            "WHERE 1=1",
            _ => { },
            retryErrors ? new[] { "Pending", "Processing", "Failed", "Blocked" } : new[] { "Pending", "Processing" },
            limit,
            cancellationToken);

    public async Task MarkProcessingAsync(string productId, CancellationToken cancellationToken)
    {
        await using var connection = await OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            UPDATE products
            SET parse_status = 'Processing', error = NULL, last_attempt_at = $now, attempts = attempts + 1
            WHERE product_id = $productId;
            """;
        command.Parameters.AddWithValue("$now", DateTimeOffset.UtcNow.ToString("O"));
        command.Parameters.AddWithValue("$productId", productId);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task SaveResultAsync(ZozoProductResult result, CancellationToken cancellationToken)
    {
        var row = result.Output;
        var status = string.IsNullOrWhiteSpace(row.Error)
            ? ParseStatus.Completed
            : result.IsBlocked ? ParseStatus.Blocked : ParseStatus.Failed;
        var now = DateTimeOffset.UtcNow.ToString("O");
        await using var connection = await OpenAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.Transaction = (SqliteTransaction)transaction;
        command.CommandText = """
            UPDATE products SET
                source_url=$sourceUrl, name=$name, brand=$brand, description=$description, material=$material,
                price=$price, original_price=$originalPrice, currency=$currency,
                photos_json=$photos, colors_json=$colors, sizes_json=$sizes, size_specs_json=$sizeSpecs,
                variants_json=$variants, movies_json=$movies, availability=$availability,
                goods_id=$goodsId, goods_detail_id=$goodsDetailId, goods_type_id=$goodsTypeId, shop_id=$shopId,
                parse_status=$status, error=$error, last_attempt_at=$now,
                parsed_at=CASE WHEN $status='Completed' THEN $now ELSE parsed_at END
            WHERE product_id=$productId;
            """;
        Add(command, "$productId", row.Id);
        Add(command, "$sourceUrl", row.SourceUrl);
        Add(command, "$name", row.Name);
        Add(command, "$brand", row.Brand);
        Add(command, "$description", row.Description);
        Add(command, "$material", row.Material);
        Add(command, "$price", row.Price);
        Add(command, "$originalPrice", row.OriginalPrice);
        Add(command, "$currency", row.Currency);
        Add(command, "$photos", row.Photos);
        Add(command, "$colors", row.Colors);
        Add(command, "$sizes", row.Sizes);
        Add(command, "$sizeSpecs", row.SizeSpecs);
        Add(command, "$variants", row.Variants);
        Add(command, "$movies", row.Movies);
        Add(command, "$availability", row.Availability);
        Add(command, "$goodsId", ParseLong(row.GoodsId));
        Add(command, "$goodsDetailId", ParseLong(row.GoodsDetailId));
        Add(command, "$goodsTypeId", ParseLong(row.GoodsTypeId));
        Add(command, "$shopId", ParseLong(row.ShopId));
        Add(command, "$status", status.ToString());
        Add(command, "$error", string.IsNullOrWhiteSpace(row.Error) ? null : row.Error);
        Add(command, "$now", now);
        await command.ExecuteNonQueryAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    public async Task FinishImportAsync(long importId, ImportTotals totals, CancellationToken cancellationToken)
    {
        await using var connection = await OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            UPDATE imports SET finished_at=$now, processed=$processed, succeeded=$succeeded,
                failed=$failed, blocked=$blocked WHERE import_id=$importId;
            """;
        Add(command, "$now", DateTimeOffset.UtcNow.ToString("O"));
        Add(command, "$processed", totals.Processed);
        Add(command, "$succeeded", totals.Succeeded);
        Add(command, "$failed", totals.Failed);
        Add(command, "$blocked", totals.Blocked);
        Add(command, "$importId", importId);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task ExportImportAsync(long importId, string path, CancellationToken cancellationToken) =>
        await ExportAsync("JOIN import_products ip ON ip.product_id=p.product_id WHERE ip.import_id=$id ORDER BY ip.rowid", path,
            command => command.Parameters.AddWithValue("$id", importId), cancellationToken);

    public async Task ExportAllAsync(string path, CancellationToken cancellationToken) =>
        await ExportAsync("ORDER BY p.first_seen_at, p.product_id", path, _ => { }, cancellationToken);

    public async Task<Dictionary<string, int>> GetStatusCountsAsync(CancellationToken cancellationToken)
    {
        var result = new Dictionary<string, int>(StringComparer.Ordinal);
        await using var connection = await OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT parse_status, COUNT(*) FROM products GROUP BY parse_status;";
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken)) result[reader.GetString(0)] = reader.GetInt32(1);
        return result;
    }

    public async Task<List<OutputProduct>> GetCompletedProductsAsync(CancellationToken cancellationToken)
    {
        var rows = new List<OutputProduct>();
        await using var connection = await OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT p.product_id,p.source_url,p.name,p.brand,p.description,p.material,p.price,p.original_price,
                p.currency,p.photos_json,p.colors_json,p.sizes_json,p.size_specs_json,p.variants_json,
                p.availability,p.movies_json,p.goods_id,p.goods_detail_id,p.goods_type_id,p.shop_id,p.parse_status,p.error
            FROM products p
            WHERE p.parse_status='Completed'
            ORDER BY p.first_seen_at,p.product_id;
            """;
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken)) rows.Add(ReadOutput(reader));
        return rows;
    }

    private async Task ExportAsync(string suffix, string path, Action<SqliteCommand> configure, CancellationToken cancellationToken)
    {
        var rows = new List<OutputProduct>();
        await using var connection = await OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = $"""
            SELECT p.product_id,p.source_url,p.name,p.brand,p.description,p.material,p.price,p.original_price,
                p.currency,p.photos_json,p.colors_json,p.sizes_json,p.size_specs_json,p.variants_json,
                p.availability,p.movies_json,p.goods_id,p.goods_detail_id,p.goods_type_id,p.shop_id,p.parse_status,p.error
            FROM products p {suffix};
            """;
        configure(command);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken)) rows.Add(ReadOutput(reader));
        await CsvOutputService.WriteExportAsync(path, rows, cancellationToken);
    }

    private async Task<List<ProcessingProduct>> QueryWorkAsync(
        string clause,
        Action<SqliteCommand> configure,
        string[]? statuses,
        int? limit,
        CancellationToken cancellationToken)
    {
        var result = new List<ProcessingProduct>();
        await using var connection = await OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        var statusSql = statuses is null ? "" : $" AND p.parse_status IN ({string.Join(',', statuses.Select((_, i) => $"$s{i}"))})";
        var limitSql = limit is > 0 ? " LIMIT $limit" : "";
        command.CommandText = $"SELECT p.product_id,p.source_url FROM products p {clause}{statusSql} ORDER BY p.first_seen_at,p.product_id{limitSql};";
        configure(command);
        if (statuses is not null)
            for (var i = 0; i < statuses.Length; i++) command.Parameters.AddWithValue($"$s{i}", statuses[i]);
        if (limit is > 0) command.Parameters.AddWithValue("$limit", limit.Value);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken)) result.Add(new(reader.GetString(0), reader.GetString(1)));
        return result;
    }

    private async Task<SqliteConnection> OpenAsync(CancellationToken cancellationToken)
    {
        var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = "PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;";
        await command.ExecuteNonQueryAsync(cancellationToken);
        return connection;
    }

    private static async Task<long> InsertImportAsync(SqliteConnection connection, System.Data.Common.DbTransaction transaction, string path, string hash, int rows, string now, CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = (SqliteTransaction)transaction;
        command.CommandText = "INSERT INTO imports(input_file,input_file_hash,started_at,total_rows) VALUES($file,$hash,$now,$rows); SELECT last_insert_rowid();";
        Add(command, "$file", path); Add(command, "$hash", hash); Add(command, "$now", now); Add(command, "$rows", rows);
        return Convert.ToInt64(await command.ExecuteScalarAsync(cancellationToken), CultureInfo.InvariantCulture);
    }

    private static async Task<(string Url, string Status)?> GetIdentityAsync(SqliteConnection connection, System.Data.Common.DbTransaction transaction, string id, CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = (SqliteTransaction)transaction;
        command.CommandText = "SELECT source_url,parse_status FROM products WHERE product_id=$id;";
        Add(command, "$id", id);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? (reader.GetString(0), reader.GetString(1)) : null;
    }

    private static async Task UpsertIdentityAsync(SqliteConnection connection, System.Data.Common.DbTransaction transaction, InputProduct row, string now, CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = (SqliteTransaction)transaction;
        command.CommandText = """
            INSERT INTO products(product_id,source_url,parse_status,first_seen_at,last_seen_at)
            VALUES($id,$url,'Pending',$now,$now)
            ON CONFLICT(product_id) DO UPDATE SET source_url=excluded.source_url,last_seen_at=excluded.last_seen_at;
            """;
        Add(command, "$id", row.Id); Add(command, "$url", row.Url); Add(command, "$now", now);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task LinkImportAsync(SqliteConnection connection, System.Data.Common.DbTransaction transaction, long importId, string productId, CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = (SqliteTransaction)transaction;
        command.CommandText = "INSERT OR IGNORE INTO import_products(import_id,product_id) VALUES($importId,$productId);";
        Add(command, "$importId", importId); Add(command, "$productId", productId);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task UpdateImportRegistrationAsync(SqliteConnection connection, System.Data.Common.DbTransaction transaction, long importId, int newProducts, int completed, CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = (SqliteTransaction)transaction;
        command.CommandText = "UPDATE imports SET new_products=$new,already_completed=$completed WHERE import_id=$id;";
        Add(command, "$new", newProducts); Add(command, "$completed", completed); Add(command, "$id", importId);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static OutputProduct ReadOutput(SqliteDataReader reader) => new()
    {
        Id = Text(reader, 0), SourceUrl = Text(reader, 1), Name = Text(reader, 2), Brand = Text(reader, 3),
        Description = Text(reader, 4), Material = Text(reader, 5), Price = Decimal(reader, 6), OriginalPrice = Decimal(reader, 7),
        Currency = Text(reader, 8), Photos = Json(reader, 9), Colors = Json(reader, 10), Sizes = Json(reader, 11),
        SizeSpecs = Json(reader, 12), Variants = Json(reader, 13), Availability = Text(reader, 14), Movies = Json(reader, 15),
        GoodsId = Text(reader, 16), GoodsDetailId = Text(reader, 17), GoodsTypeId = Text(reader, 18), ShopId = Text(reader, 19),
        Status = Text(reader, 20), Error = Text(reader, 21),
    };

    private static string Text(SqliteDataReader reader, int ordinal) => reader.IsDBNull(ordinal) ? "" : Convert.ToString(reader.GetValue(ordinal), CultureInfo.InvariantCulture) ?? "";
    private static string Json(SqliteDataReader reader, int ordinal) => reader.IsDBNull(ordinal) ? "[]" : reader.GetString(ordinal);
    private static decimal? Decimal(SqliteDataReader reader, int ordinal) => reader.IsDBNull(ordinal) ? null : Convert.ToDecimal(reader.GetValue(ordinal), CultureInfo.InvariantCulture);
    private static long? ParseLong(string value) => long.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed) ? parsed : null;
    private static void Add(SqliteCommand command, string name, object? value) => command.Parameters.AddWithValue(name, value ?? DBNull.Value);
}
