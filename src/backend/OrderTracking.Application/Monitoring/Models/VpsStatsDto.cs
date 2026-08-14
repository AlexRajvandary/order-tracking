namespace OrderTracking.Application.Monitoring.Models;

public sealed record VpsStatsDto(
    IReadOnlyList<VpsStatsSeriesDto> Series,
    string Subtitle);

public sealed record VpsStatsSeriesDto(
    string Name,
    string? Color,
    string? Type,
    IReadOnlyList<VpsStatsPointDto> Data);

public sealed record VpsStatsPointDto(long Timestamp, double Value);
