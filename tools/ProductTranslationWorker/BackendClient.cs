using System.Net.Http.Json;
using Microsoft.Extensions.Options;

namespace ProductTranslationWorker;

public sealed class BackendClient(HttpClient http, IOptions<BackendOptions> options)
{
    private readonly BackendOptions o = options.Value;

    public async Task<IReadOnlyList<PendingProductDto>> PendingAsync(int limit, CancellationToken ct)
    {
        return await http.GetFromJsonAsync<List<PendingProductDto>>($"{o.PendingEndpoint}?limit={Math.Clamp(limit, 1, 200)}", ct) ?? [];
    }

    public Task<TranslationStatsDto?> StatsAsync(CancellationToken ct) => http.GetFromJsonAsync<TranslationStatsDto>(o.StatsEndpoint, ct);

    public async Task<SaveProductTranslationsResponse> SaveAsync(IReadOnlyList<ProductTranslationResultDto> items, CancellationToken ct) { using var r = await http.PostAsJsonAsync(o.SaveEndpoint, new SaveProductTranslationsRequest(items), ct); r.EnsureSuccessStatusCode(); return await r.Content.ReadFromJsonAsync<SaveProductTranslationsResponse>(cancellationToken: ct) ?? new(items.Count, 0, items.Count); }
}