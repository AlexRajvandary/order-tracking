using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Monitoring.Models;
using OrderTracking.Infrastructure.Monitoring;

namespace OrderTracking.Infrastructure.Services;

public sealed class FornexVpsStatsService : IVpsStatsService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly HttpClient _httpClient;
    private readonly FornexSettings _settings;
    private readonly ILogger<FornexVpsStatsService> _logger;

    public FornexVpsStatsService(
        HttpClient httpClient,
        IOptions<FornexSettings> settings,
        ILogger<FornexVpsStatsService> logger)
    {
        _httpClient = httpClient;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<VpsStatsDto> GetAsync(
        string field,
        DateTimeOffset start,
        DateTimeOffset end,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_settings.ApiKey)
            || string.IsNullOrWhiteSpace(_settings.OrderId))
        {
            throw new InvalidOperationException(
                "Fornex monitoring is not configured. Set FORNEX_API_KEY and FORNEX_ORDER_ID.");
        }

        var path = $"vps/{Uri.EscapeDataString(_settings.OrderId.Trim())}/stats/" +
                   $"{Uri.EscapeDataString(field)}/?start={Uri.EscapeDataString(FormatDate(start))}" +
                   $"&end={Uri.EscapeDataString(FormatDate(end))}";
        using var request = new HttpRequestMessage(HttpMethod.Get, path);
        request.Headers.TryAddWithoutValidation("Authorization", $"Api-Key {_settings.ApiKey.Trim()}");
        request.Headers.TryAddWithoutValidation("Accept", "application/json");

        using var response = await _httpClient.SendAsync(
            request,
            HttpCompletionOption.ResponseHeadersRead,
            cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning(
                "Fornex stats request for {Field} failed with status {StatusCode}",
                field,
                (int)response.StatusCode);
            throw new HttpRequestException(
                $"Fornex returned HTTP {(int)response.StatusCode} for field '{field}'.",
                null,
                response.StatusCode);
        }

        var payload = await response.Content.ReadFromJsonAsync<FornexChartResponse>(
            JsonOptions,
            cancellationToken);
        if (payload?.Series is null)
            throw new HttpRequestException("Fornex returned an invalid statistics response.");

        var series = payload.Series
            .Select(item => new VpsStatsSeriesDto(
                item.Name?.Trim() ?? string.Empty,
                item.Color,
                item.Type,
                (item.Data ?? [])
                    .Where(point => point.Count >= 2
                                    && double.IsFinite(point[0])
                                    && double.IsFinite(point[1]))
                    .Select(point => new VpsStatsPointDto(
                        checked((long)Math.Round(point[0])),
                        point[1]))
                    .ToList()))
            .Where(item => item.Data.Count > 0)
            .ToList();

        return new VpsStatsDto(series, payload.Subtitle?.Trim() ?? string.Empty);
    }

    private static string FormatDate(DateTimeOffset value) =>
        value.UtcDateTime.ToString("O", CultureInfo.InvariantCulture);

    private sealed record FornexChartResponse(
        IReadOnlyList<FornexChartSeries>? Series,
        string? Subtitle);

    private sealed record FornexChartSeries(
        string? Name,
        string? Color,
        string? Type,
        IReadOnlyList<IReadOnlyList<double>>? Data);
}
