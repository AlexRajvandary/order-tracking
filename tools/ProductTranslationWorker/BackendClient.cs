using System.Net.Http.Json;
using Microsoft.Extensions.Options;

namespace ProductTranslationWorker;

public sealed class BackendClient(HttpClient http, IOptions<BackendOptions> options)
{
    private readonly BackendOptions o = options.Value;

    public async Task<IReadOnlyList<PendingProductDto>> PendingAsync(int limit, CancellationToken cancellationToken)
    {
        return await http.GetFromJsonAsync<List<PendingProductDto>>($"{o.PendingEndpoint}?limit={Math.Clamp(limit, 1, 200)}", cancellationToken) ?? [];
    }

    public Task<TranslationStatsDto?> StatsAsync(CancellationToken cancellationToken) => http.GetFromJsonAsync<TranslationStatsDto>(o.StatsEndpoint, cancellationToken);

    public async Task<SaveProductTranslationsResponse> SaveAsync(IReadOnlyList<ProductTranslationResultDto> items, CancellationToken cancellationToken)
    {
        using var r = await http.PostAsJsonAsync(o.SaveEndpoint, new SaveProductTranslationsRequest(items), cancellationToken);
        r.EnsureSuccessStatusCode();
        return await r.Content.ReadFromJsonAsync<SaveProductTranslationsResponse>(cancellationToken)
            ?? new(items.Count, 0, items.Count);
    }
}