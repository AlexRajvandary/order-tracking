using MediatR;
using OrderTracking.Application.Common.Audit;
using OrderTracking.Application.Common.Interfaces;

namespace OrderTracking.Application.Common.Behaviors;

public sealed class AuditBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly IAuditService _auditService;
    private readonly IAuditSnapshotService _snapshotService;
    private readonly ICurrentUserService _currentUser;

    public AuditBehavior(
        IAuditService auditService,
        IAuditSnapshotService snapshotService,
        ICurrentUserService currentUser)
    {
        _auditService = auditService;
        _snapshotService = snapshotService;
        _currentUser = currentUser;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        if (request is not IAuditableCommand)
        {
            return await next(cancellationToken);
        }

        var entityType = InferEntityType(typeof(TRequest));
        var action = typeof(TRequest).Name.Replace("Command", string.Empty, StringComparison.Ordinal);
        var isDelete = action.StartsWith("Delete", StringComparison.Ordinal);
        var isCreate = action.StartsWith("Create", StringComparison.Ordinal)
                       || action.StartsWith("Add", StringComparison.Ordinal);

        IReadOnlyDictionary<string, string?>? before = null;
        if (!isCreate)
        {
            before = await _snapshotService.CaptureAsync(
                request,
                entityType,
                includeDeleted: action.StartsWith("Restore", StringComparison.Ordinal),
                cancellationToken);
        }

        var response = await next(cancellationToken);

        var entityId = TryGetGuid(request, "Id", "OrderId", "CustomerId", "ItemId")
            ?? TryGetGuid(response!, "Id")
            ?? _currentUser.UserId
            ?? Guid.Empty;

        IReadOnlyDictionary<string, string?>? after = null;
        if (!isDelete)
        {
            // Prefer capturing the persisted entity; for creates the Id may only exist on response.
            after = await _snapshotService.CaptureAsync(
                response is null || response.Equals(default(TResponse)) ? request : response,
                entityType,
                includeDeleted: false,
                cancellationToken);

            if (after is null && !ReferenceEquals(request, response))
            {
                after = await _snapshotService.CaptureAsync(
                    request,
                    entityType,
                    includeDeleted: false,
                    cancellationToken);
            }
        }
        else
        {
            after = await _snapshotService.CaptureAsync(
                request,
                entityType,
                includeDeleted: true,
                cancellationToken);
        }

        var changes = AuditValueDiff.Diff(before, after);
        var oldValues = AuditValueDiff.SerializeChanged(changes, c => c.OldValue);
        var newValues = AuditValueDiff.SerializeChanged(changes, c => c.NewValue);

        // Fallback for commands without entity snapshots (e.g. ChangePassword).
        if (changes.Count == 0 && isCreate)
        {
            newValues = SerializeRedacted(request);
        }

        await _auditService.WriteAsync(
            entityType,
            entityId,
            action,
            oldValues,
            newValues,
            cancellationToken);

        return response;
    }

    private static string InferEntityType(Type requestType)
    {
        var ns = requestType.Namespace ?? string.Empty;
        if (ns.Contains(".Orders.", StringComparison.Ordinal))
        {
            return "Order";
        }

        if (ns.Contains(".Customers.", StringComparison.Ordinal))
        {
            return "Customer";
        }

        if (ns.Contains(".Statuses.", StringComparison.Ordinal))
        {
            return "StatusDefinition";
        }

        if (ns.Contains(".Identity.", StringComparison.Ordinal))
        {
            return "AdminUser";
        }

        return "Unknown";
    }

    private static Guid? TryGetGuid(object target, params string[] propertyNames)
    {
        var type = target.GetType();
        foreach (var name in propertyNames)
        {
            var property = type.GetProperty(name);
            if (property is null)
            {
                continue;
            }

            var value = property.GetValue(target);
            if (value is Guid guid && guid != Guid.Empty)
            {
                return guid;
            }
        }

        return null;
    }

    private static string SerializeRedacted(object request)
    {
        using var document = System.Text.Json.JsonSerializer.SerializeToDocument(
            request,
            new System.Text.Json.JsonSerializerOptions
            {
                PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
                DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
            });

        using var stream = new MemoryStream();
        using (var writer = new System.Text.Json.Utf8JsonWriter(stream))
        {
            WriteRedacted(writer, document.RootElement);
        }

        return System.Text.Encoding.UTF8.GetString(stream.ToArray());
    }

    private static readonly HashSet<string> RedactedProperties = new(StringComparer.OrdinalIgnoreCase)
    {
        "Password",
        "CurrentPassword",
        "NewPassword",
        "RefreshToken",
    };

    private static void WriteRedacted(System.Text.Json.Utf8JsonWriter writer, System.Text.Json.JsonElement element)
    {
        switch (element.ValueKind)
        {
            case System.Text.Json.JsonValueKind.Object:
                writer.WriteStartObject();
                foreach (var property in element.EnumerateObject())
                {
                    writer.WritePropertyName(property.Name);
                    if (RedactedProperties.Contains(property.Name))
                    {
                        writer.WriteStringValue("***");
                    }
                    else
                    {
                        WriteRedacted(writer, property.Value);
                    }
                }

                writer.WriteEndObject();
                break;
            case System.Text.Json.JsonValueKind.Array:
                writer.WriteStartArray();
                foreach (var item in element.EnumerateArray())
                {
                    WriteRedacted(writer, item);
                }

                writer.WriteEndArray();
                break;
            default:
                element.WriteTo(writer);
                break;
        }
    }
}
