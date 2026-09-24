using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using ZozoEnrichmentTester.Models;

namespace ZozoEnrichmentTester.Services;

public sealed record PostgresImportGenerationResult(string Path, int CompletedRows, int WrittenRows, int SkippedRows);

public static class PostgresImportSqlGenerator
{
    public static async Task<PostgresImportGenerationResult> GenerateAsync(
        IReadOnlyList<OutputProduct> products,
        string path,
        CancellationToken cancellationToken)
    {
        var valid = products.Where(x => Guid.TryParse(x.Id, out _)).ToList();
        Directory.CreateDirectory(Path.GetDirectoryName(path) ?? ".");
        await using var writer = new StreamWriter(path, false, new UTF8Encoding(false));
        await writer.WriteLineAsync(SqlHeader);

        foreach (var row in valid)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var payload = BuildPayload(row).ToJsonString(new JsonSerializerOptions { WriteIndented = false });
            await writer.WriteLineAsync($"INSERT INTO zozo_import(payload) VALUES ('{EscapeLiteral(payload)}'::jsonb);");
        }

        await writer.WriteLineAsync(SqlBody);
        return new(Path.GetFullPath(path), products.Count, valid.Count, products.Count - valid.Count);
    }

    private static JsonObject BuildPayload(OutputProduct row) => new()
    {
        ["product_id"] = row.Id,
        ["source_url"] = row.SourceUrl,
        ["name"] = row.Name,
        ["brand"] = row.Brand,
        ["description"] = row.Description,
        ["material"] = row.Material,
        ["price"] = JsonValue.Create(row.Price),
        ["original_price"] = JsonValue.Create(row.OriginalPrice),
        ["currency"] = row.Currency,
        ["photos"] = ParseArray(row.Photos),
        ["colors"] = ParseArray(row.Colors),
        ["sizes"] = ParseArray(row.Sizes),
        ["size_specs"] = ParseArray(row.SizeSpecs),
        ["variants"] = ParseArray(row.Variants),
        ["availability"] = row.Availability,
        ["movies"] = ParseArray(row.Movies),
        ["goods_id"] = Long(row.GoodsId),
        ["goods_detail_id"] = Long(row.GoodsDetailId),
        ["goods_type_id"] = Long(row.GoodsTypeId),
        ["shop_id"] = Long(row.ShopId),
    };

    private static JsonNode ParseArray(string value)
    {
        try
        {
            var parsed = JsonNode.Parse(value);
            return parsed is JsonArray ? parsed : new JsonArray();
        }
        catch (JsonException)
        {
            return new JsonArray();
        }
    }

    private static JsonNode? Long(string value) => long.TryParse(value, out var parsed) ? JsonValue.Create(parsed) : null;
    private static string EscapeLiteral(string value) => value.Replace("'", "''", StringComparison.Ordinal);

    private const string SqlHeader = """
        BEGIN;

        CREATE TEMP TABLE zozo_import (
            payload jsonb NOT NULL
        ) ON COMMIT DROP;
        """;

    private const string SqlBody = """

        CREATE TEMP TABLE zozo_matched ON COMMIT DROP AS
        SELECT (z.payload->>'product_id')::uuid AS product_id, z.payload
        FROM zozo_import z
        JOIN products p ON p."Id" = (z.payload->>'product_id')::uuid;

        UPDATE products AS p
        SET "Name" = COALESCE(NULLIF(m.payload->>'name', ''), p."Name"),
            "Description" = COALESCE(NULLIF(m.payload->>'description', ''), p."Description"),
            "Brand" = COALESCE(NULLIF(m.payload->>'brand', ''), p."Brand"),
            "Price" = COALESCE((m.payload->>'price')::numeric, p."Price"),
            "CurrencyCode" = COALESCE(NULLIF(upper(m.payload->>'currency'), ''), p."CurrencyCode"),
            "OriginalPrice" = COALESCE((m.payload->>'original_price')::numeric, p."OriginalPrice"),
            "OriginalCurrencyCode" = CASE
                WHEN m.payload->>'original_price' IS NOT NULL THEN COALESCE(NULLIF(upper(m.payload->>'currency'), ''), p."OriginalCurrencyCode")
                ELSE p."OriginalCurrencyCode" END,
            "SourceUrl" = COALESCE(NULLIF(m.payload->>'source_url', ''), p."SourceUrl"),
            "LocalImageUrl" = CASE
                WHEN NULLIF(m.payload->'photos'->>0, '') IS NOT NULL
                 AND NULLIF(m.payload->'photos'->>0, '') IS DISTINCT FROM p."ImageUrl" THEN NULL
                ELSE p."LocalImageUrl" END,
            "ImageUrl" = COALESCE(NULLIF(m.payload->'photos'->>0, ''), p."ImageUrl"),
            "UpdatedAt" = now()
        FROM zozo_matched m
        WHERE p."Id" = m.product_id;

        INSERT INTO product_source_details
            ("ProductId", "Source", "Material", "Availability", "ExternalGoodsId", "ExternalGoodsDetailId", "ExternalGoodsTypeId", "ExternalShopId", "UpdatedAt")
        SELECT product_id, 'ZOZO', NULLIF(payload->>'material', ''), NULLIF(payload->>'availability', ''),
            (payload->>'goods_id')::bigint, (payload->>'goods_detail_id')::bigint,
            (payload->>'goods_type_id')::bigint, (payload->>'shop_id')::bigint, now()
        FROM zozo_matched
        ON CONFLICT ("ProductId") DO UPDATE SET
            "Source" = excluded."Source", "Material" = excluded."Material", "Availability" = excluded."Availability",
            "ExternalGoodsId" = excluded."ExternalGoodsId", "ExternalGoodsDetailId" = excluded."ExternalGoodsDetailId",
            "ExternalGoodsTypeId" = excluded."ExternalGoodsTypeId", "ExternalShopId" = excluded."ExternalShopId", "UpdatedAt" = now();

        DELETE FROM product_images i USING zozo_matched m
        WHERE i."ProductId" = m.product_id AND jsonb_array_length(m.payload->'photos') > 0;
        INSERT INTO product_images ("Id", "ProductId", "ImageUrl", "SortOrder", "IsPrimary", "CreatedAt")
        SELECT gen_random_uuid(), m.product_id, left(photo.url, 2000), (photo.ordinality - 1)::integer, photo.ordinality = 1, now()
        FROM zozo_matched m
        CROSS JOIN LATERAL jsonb_array_elements_text(m.payload->'photos') WITH ORDINALITY AS photo(url, ordinality)
        WHERE NULLIF(photo.url, '') IS NOT NULL;

        DELETE FROM product_variants v USING zozo_matched m
        WHERE v."ProductId" = m.product_id
          AND (jsonb_array_length(m.payload->'variants') > 0 OR jsonb_array_length(m.payload->'sizes') > 0);
        DELETE FROM product_colors c USING zozo_matched m
        WHERE c."ProductId" = m.product_id AND jsonb_array_length(m.payload->'colors') > 0;
        DELETE FROM product_sizes s USING zozo_matched m
        WHERE s."ProductId" = m.product_id AND jsonb_array_length(m.payload->'sizes') > 0;

        INSERT INTO product_colors ("Id", "ProductId", "ExternalId", "Name", "SortOrder", "CreatedAt")
        SELECT gen_random_uuid(), m.product_id, (color.value->>'id')::bigint, left(color.value->>'name', 200),
            (color.ordinality - 1)::integer, now()
        FROM zozo_matched m
        CROSS JOIN LATERAL jsonb_array_elements(m.payload->'colors') WITH ORDINALITY AS color(value, ordinality)
        WHERE NULLIF(color.value->>'name', '') IS NOT NULL;

        INSERT INTO product_sizes ("Id", "ProductId", "ExternalId", "Name", "ShortName", "SpecificationsJson", "SortOrder", "CreatedAt")
        SELECT gen_random_uuid(), m.product_id, (size.value->>'id')::bigint, left(size.value->>'name', 100),
            left(NULLIF(size.value->>'shortName', ''), 100), spec.value->'specs', (size.ordinality - 1)::integer, now()
        FROM zozo_matched m
        CROSS JOIN LATERAL jsonb_array_elements(m.payload->'sizes') WITH ORDINALITY AS size(value, ordinality)
        LEFT JOIN LATERAL (
            SELECT value FROM jsonb_array_elements(m.payload->'size_specs') value
            WHERE value->>'size' = size.value->>'name' LIMIT 1
        ) spec ON true
        WHERE NULLIF(size.value->>'name', '') IS NOT NULL;

        INSERT INTO product_variants
            ("Id", "ProductId", "ProductColorId", "ProductSizeId", "ExternalColorId", "ExternalSizeId", "Color", "Size", "Price", "CurrencyCode", "IsAvailable", "CreatedAt", "UpdatedAt")
        SELECT gen_random_uuid(), m.product_id, color.id, size.id,
            (variant.value->>'colorId')::bigint, (variant.value->>'sizeId')::bigint,
            left(NULLIF(variant.value->>'color', ''), 200), left(NULLIF(variant.value->>'size', ''), 100),
            (m.payload->>'price')::numeric, NULLIF(upper(m.payload->>'currency'), ''),
            (variant.value->>'available')::boolean, now(), NULL
        FROM zozo_matched m
        CROSS JOIN LATERAL jsonb_array_elements(m.payload->'variants') AS variant(value)
        LEFT JOIN LATERAL (
            SELECT c."Id" AS id FROM product_colors c WHERE c."ProductId" = m.product_id
              AND (c."ExternalId" = (variant.value->>'colorId')::bigint OR c."Name" = variant.value->>'color') LIMIT 1
        ) color ON true
        LEFT JOIN LATERAL (
            SELECT s."Id" AS id FROM product_sizes s WHERE s."ProductId" = m.product_id
              AND (s."ExternalId" = (variant.value->>'sizeId')::bigint OR s."Name" = variant.value->>'size') LIMIT 1
        ) size ON true;

        INSERT INTO product_variants
            ("Id", "ProductId", "ProductSizeId", "ExternalSizeId", "Size", "Price", "CurrencyCode", "IsAvailable", "CreatedAt", "UpdatedAt")
        SELECT gen_random_uuid(), m.product_id, s."Id", s."ExternalId", s."Name",
            (m.payload->>'price')::numeric, NULLIF(upper(m.payload->>'currency'), ''), NULL, now(), NULL
        FROM zozo_matched m
        JOIN product_sizes s ON s."ProductId" = m.product_id
        WHERE jsonb_array_length(m.payload->'variants') = 0 AND jsonb_array_length(m.payload->'sizes') > 0;

        DELETE FROM product_media media USING zozo_matched m
        WHERE media."ProductId" = m.product_id AND jsonb_array_length(m.payload->'movies') > 0;
        INSERT INTO product_media ("Id", "ProductId", "MediaType", "ExternalId", "Url", "FileName", "SortOrder", "CreatedAt")
        SELECT gen_random_uuid(), m.product_id, 'Video', (movie.value->>'movie_id')::bigint,
            left(movie.value->>'movie_url', 2000), left(NULLIF(movie.value->>'movie_file_name', ''), 500),
            (movie.ordinality - 1)::integer, now()
        FROM zozo_matched m
        CROSS JOIN LATERAL jsonb_array_elements(m.payload->'movies') WITH ORDINALITY AS movie(value, ordinality)
        WHERE NULLIF(movie.value->>'movie_url', '') IS NOT NULL;

        SELECT (SELECT count(*) FROM zozo_import) AS input_rows,
               (SELECT count(*) FROM zozo_matched) AS matched_products,
               (SELECT count(*) FROM zozo_import) - (SELECT count(*) FROM zozo_matched) AS missing_products;

        COMMIT;
        """;
}
