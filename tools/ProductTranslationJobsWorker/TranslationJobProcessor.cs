using Microsoft.Extensions.Logging;

namespace ProductTranslationJobsWorker;

public sealed class TranslationJobProcessor
{
    private readonly TranslationJobApiClient _jobApi;

    private readonly ProductsClient _productsClient;

    private readonly OpenAiTranslationClient _openAiClient;

    private readonly ILogger<TranslationJobProcessor> _logger;

    public TranslationJobProcessor(
        TranslationJobApiClient jobApi,
        ProductsClient productsClient,
        OpenAiTranslationClient openAiClient,
        ILogger<TranslationJobProcessor> logger)
    {
        _jobApi = jobApi;
        _productsClient = productsClient;
        _openAiClient = openAiClient;
        _logger = logger;
    }

    public async Task ProcessAsync(
        TranslationWorkerJobDto job,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation(
            "Starting translation job {JobId}; model={Model}; parallelism={Parallelism}; batchSize={BatchSize}",
            job.Id,
            job.Model,
            job.Parallelism,
            job.BatchSize);

        var consumers = Enumerable.Range(0, Math.Max(1, job.Parallelism))
            .Select(_ => ConsumeBatchesAsync(job, cancellationToken))
            .ToArray();
        await Task.WhenAll(consumers);
        await _jobApi.CompleteJobAsync(job.Id, cancellationToken);
    }

    private async Task ConsumeBatchesAsync(
        TranslationWorkerJobDto job,
        CancellationToken cancellationToken)
    {
        var idlePolls = 0;
        while (!cancellationToken.IsCancellationRequested)
        {
            TranslationWorkerBatchDto? batch;
            try
            {
                batch = await _jobApi.ClaimBatchAsync(job.Id, cancellationToken);
            }
            catch (Exception exception) when (exception is HttpRequestException)
            {
                _logger.LogWarning(exception, "Could not claim a translation batch for job {JobId}.", job.Id);
                await Task.Delay(TimeSpan.FromSeconds(2), cancellationToken);
                continue;
            }

            if (batch is null)
            {
                idlePolls++;
                if (idlePolls >= 3)
                {
                    return;
                }

                await Task.Delay(TimeSpan.FromMilliseconds(500), cancellationToken);
                continue;
            }

            idlePolls = 0;
            await ProcessBatchAsync(job, batch, cancellationToken);
        }
    }

    private async Task ProcessBatchAsync(
        TranslationWorkerJobDto job,
        TranslationWorkerBatchDto batch,
        CancellationToken cancellationToken)
    {
        var startedAt = DateTimeOffset.UtcNow;
        try
        {
            var snapshot = await _jobApi.GetBatchItemIdsAsync(job.Id, batch.Id, cancellationToken);
            var productIds = snapshot.Select(x => x.Id).ToArray();
            var products = await _productsClient.GetSourceAsync(productIds, cancellationToken);
            var expectedIds = productIds.ToHashSet();
            if (products.Count != expectedIds.Count
                || products.Select(x => x.Id).Distinct().Count() != expectedIds.Count
                || products.Any(x => !expectedIds.Contains(x.Id)))
            {
                throw new InvalidDataException("Products API returned an unexpected set of products for the batch.");
            }

            var result = await _openAiClient.TranslateAsync(products, job.Model, cancellationToken);
            await _productsClient.SaveTranslationsAsync(
                result.Items,
                job.Scope == Products.Domain.Enums.TranslationJobScope.AllUntranslated,
                cancellationToken);
            await _jobApi.CompleteBatchAsync(
                job.Id,
                batch.Id,
                new CompleteTranslationBatchRequest(
                    result.Items,
                    result.PromptTokens,
                    result.CompletionTokens,
                    result.ReasoningTokens,
                    result.TotalTokens,
                    result.DurationMs,
                    result.RequestId,
                    0,
                    null),
                cancellationToken);
            TranslationLogging.LogTranslations(_logger, job.Id, batch.Id, result.Items);
            _logger.LogInformation(
                "Translation batch completed. JobId: {JobId}; BatchId: {BatchId}; BatchNumber: {BatchNumber}; Products: {Products}; DurationMs: {DurationMs}; PromptTokens: {PromptTokens}; CompletionTokens: {CompletionTokens}; TotalTokens: {TotalTokens}",
                job.Id,
                batch.Id,
                batch.BatchNumber,
                result.Items.Count,
                result.DurationMs,
                result.PromptTokens,
                result.CompletionTokens,
                result.TotalTokens);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            var duration = Math.Max(0, (long)(DateTimeOffset.UtcNow - startedAt).TotalMilliseconds);
            var error = exception.Message.Length > 4000
                ? exception.Message[..4000]
                : exception.Message;
            _logger.LogError(
                exception,
                "Translation batch failed. JobId: {JobId}; BatchId: {BatchId}; Attempt: {Attempt}; DurationMs: {DurationMs}",
                job.Id,
                batch.Id,
                batch.Attempt,
                duration);
            await _jobApi.CompleteBatchAsync(
                job.Id,
                batch.Id,
                new CompleteTranslationBatchRequest(
                    [],
                    0,
                    0,
                    0,
                    0,
                    duration,
                    null,
                    batch.ItemCount,
                    error),
                cancellationToken);
        }
    }
}
