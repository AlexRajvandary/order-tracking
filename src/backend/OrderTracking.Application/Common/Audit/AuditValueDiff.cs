using System.Text.Json;
using System.Text.Json.Nodes;

namespace OrderTracking.Application.Common.Audit;

public static class AuditValueDiff
{
    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
    };

    public static IReadOnlyList<AuditFieldChange> Diff(
        IReadOnlyDictionary<string, string?>? before,
        IReadOnlyDictionary<string, string?>? after)
    {
        var changes = new List<AuditFieldChange>();
        var keys = new SortedSet<string>(StringComparer.OrdinalIgnoreCase);

        if (before is not null)
        {
            foreach (var key in before.Keys)
            {
                keys.Add(key);
            }
        }

        if (after is not null)
        {
            foreach (var key in after.Keys)
            {
                keys.Add(key);
            }
        }

        foreach (var key in keys)
        {
            var oldNormalized = Normalize(Get(before, key));
            var newNormalized = Normalize(Get(after, key));

            if (string.Equals(oldNormalized, newNormalized, StringComparison.Ordinal))
            {
                continue;
            }

            changes.Add(new AuditFieldChange(ToCamelCase(key), oldNormalized, newNormalized));
        }

        return changes;
    }

    public static IReadOnlyList<AuditFieldChange> FromStoredJson(string? oldValuesJson, string? newValuesJson) =>
        Diff(ParseObject(oldValuesJson), ParseObject(newValuesJson));

    public static string? SerializeChanged(
        IReadOnlyList<AuditFieldChange> changes,
        Func<AuditFieldChange, string?> selector)
    {
        if (changes.Count == 0)
        {
            return null;
        }

        var map = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
        foreach (var change in changes)
        {
            map[change.Field] = selector(change);
        }

        return JsonSerializer.Serialize(map, SerializerOptions);
    }

    private static string? Get(IReadOnlyDictionary<string, string?>? source, string key) =>
        source is not null && source.TryGetValue(key, out var value) ? value : null;

    private static IReadOnlyDictionary<string, string?>? ParseObject(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return null;
        }

        try
        {
            var node = JsonNode.Parse(json);
            if (node is not JsonObject obj)
            {
                return null;
            }

            var result = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
            foreach (var (key, value) in obj)
            {
                result[key] = Flatten(value);
            }

            return result;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static string? Flatten(JsonNode? node)
    {
        if (node is null || node.GetValueKind() == JsonValueKind.Null)
        {
            return null;
        }

        return node.GetValueKind() switch
        {
            JsonValueKind.String => node.GetValue<string>(),
            JsonValueKind.Number => node.ToJsonString(),
            JsonValueKind.True => "true",
            JsonValueKind.False => "false",
            _ => node.ToJsonString(),
        };
    }

    private static string? Normalize(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string ToCamelCase(string value)
    {
        if (string.IsNullOrEmpty(value) || char.IsLower(value[0]))
        {
            return value;
        }

        return char.ToLowerInvariant(value[0]) + value[1..];
    }
}
