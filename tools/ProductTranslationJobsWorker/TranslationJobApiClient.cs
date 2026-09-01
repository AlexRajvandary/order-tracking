using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Http;
using Microsoft.Extensions.Options;

namespace ProductTranslationJobsWorker;

public sealed class TranslationJobApiClient
{
    private static readonly JsonSerializerOptions JsonOptions = CreateJsonOptions();

    private readonly IHttpClientFactory _httpClientFactory;

    private readonly TranslationJobsOptions _options;

    private readonly ILogger<TranslationJobApiClient> _logger;

    public TranslationJobApiClient(
        IHttpClientFactory httpClientFactory,
        IOptions<TranslationJobsOptions> options,
        ILogger<TranslationJobApiClient> logger)
    {
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<TranslationWorkerJobDto?> ClaimJobAsync(CancellationToken cancellationToken)
    {
        using var response = await SendAsync(HttpMethod.Post, "worker/claim", null, cancellationToken);
        if (response.StatusCode == HttpStatusCode.NoContent)
        {
            return null;
        }

        return await ReadAsync<TranslationWorkerJobDto>(response, cancellationToken);
    }

    public async Task<TranslationWorkerBatchDto?> ClaimBatchAsync(
        Guid jobId,
        CancellationToken cancellationToken)
    {
        using var response = await SendAsync(
            HttpMethod.Post,
            $"worker/{jobId}/batch/claim",
            null,
            cancellationToken);
        if (response.StatusCode == HttpStatusCode.NoContent)
        {
            return null;
        }

        return await ReadAsync<TranslationWorkerBatchDto>(response, cancellationToken);
    }

    public async Task<IReadOnlyList<TranslationSourceDto>> GetBatchItemIdsAsync(
        Guid jobId,
        Guid batchId,
        CancellationToken cancellationToken)
    {
        using var response = await SendAsync(
            HttpMethod.Get,
            $"worker/{jobId}/batch/{batchId}/items",
            null,
            cancellationToken);
        return await ReadAsync<List<TranslationSourceDto>>(response, cancellationToken) ?? [];
    }

    public async Task CompleteBatchAsync(
        Guid jobId,
        Guid batchId,
        CompleteTranslationBatchRequest request,
        CancellationToken cancellationToken)
    {
        using var response = await SendAsync(
            HttpMethod.Post,
            $"worker/{jobId}/batch/{batchId}/complete",
            request,
            cancellationToken);
    }

    public async Task CompleteJobAsync(Guid jobId, CancellationToken cancellationToken)
    {
        using var response = await SendAsync(
            HttpMethod.Post,
            $"worker/{jobId}/complete",
            null,
            cancellationToken);
    }

    public async Task FailJobAsync(
        Guid jobId,
        string error,
        CancellationToken cancellationToken)
    {
        using var response = await SendAsync(
            HttpMethod.Post,
            $"worker/{jobId}/fail",
            new WorkerFailureRequest(error),
            cancellationToken);
    }

    private async Task<HttpResponseMessage> SendAsync(
        HttpMethod method,
        string path,
        object? body,
        CancellationToken cancellationToken)
    {
        var client = _httpClientFactory.CreateClient("translation-jobs");
        using var request = new HttpRequestMessage(method, path);
        request.Headers.Add("X-Translation-Worker-Key", _options.WorkerApiKey);
        if (body is not null)
        {
            request.Content = JsonContent.Create(body, options: JsonOptions);
        }

        var response = await client.SendAsync(request, cancellationToken);
        if (response.IsSuccessStatusCode)
        {
            return response;
        }

        var text = await response.Content.ReadAsStringAsync(cancellationToken);
        _logger.LogWarning(
            "Translation jobs API returned {StatusCode} for {Path}: {Body}",
            (int)response.StatusCode,
            path,
            text.Length > 1000 ? text[..1000] : text);
        response.Dispose();
        throw new HttpRequestException(
            $"Translation jobs API returned {(int)response.StatusCode}.",
            null,
            response.StatusCode);
    }

    private static async Task<T?> ReadAsync<T>(
        HttpResponseMessage response,
        CancellationToken cancellationToken)
    {
        return await response.Content.ReadFromJsonAsync<T>(JsonOptions, cancellationToken);
    }

    private static JsonSerializerOptions CreateJsonOptions()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        options.Converters.Add(new JsonStringEnumConverter());
        return options;
    }
}
