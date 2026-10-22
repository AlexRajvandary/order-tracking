
namespace OrderTracking.Application.Common.Persistence.Models;

public sealed record StatusDefinitionListRow(
    Guid Id,
    string Name,
    string? Color,
    string? DefaultCountry,
    string? DefaultLocation,
    int? PublishAfterDays,
    int SortOrder,
    bool IsActive,
    bool IsFinal,
    DateTimeOffset CreatedAt);

public sealed record StatusDefinitionListCriteria(bool IncludeInactive);
