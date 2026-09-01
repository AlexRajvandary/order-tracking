using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ProductTranslationJobsWorker;

public sealed class TranslationWorker : BackgroundService
{
    private readonly TranslationJobApiClient _jobApi;

    private readonly TranslationJobProcessor _processor;

    private readonly OpenAiTranslationClient _openAiClient;

    private readonly TranslationJobsOptions _options;

    private readonly ILogger<TranslationWorker> _logger;

    public TranslationWorker(
        TranslationJobApiClient jobApi,
        TranslationJobProcessor processor,
        OpenAiTranslationClient openAiClient,
        IOptions<TranslationJobsOptions> options,
        ILogger<TranslationWorker> logger)
    {
        _jobApi = jobApi;
        _processor = processor;
        _openAiClient = openAiClient;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await _openAiClient.CheckConnectionAsync(stoppingToken);
                _logger.LogInformation("OpenAI connection check succeeded.");
                break;
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                _logger.LogError(exception, "OpenAI connection check failed; retrying.");
                await Task.Delay(TimeSpan.FromSeconds(_options.PollIntervalSeconds), stoppingToken);
            }
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var job = await _jobApi.ClaimJobAsync(stoppingToken);
                if (job is not null)
                {
                    try
                    {
                        await _processor.ProcessAsync(job, stoppingToken);
                    }
                    catch (Exception exception) when (exception is not OperationCanceledException)
                    {
                        _logger.LogError(exception, "Translation job {JobId} failed at orchestration level.", job.Id);
                        await _jobApi.FailJobAsync(job.Id, exception.Message, stoppingToken);
                    }

                    continue;
                }

                await Task.Delay(
                    TimeSpan.FromSeconds(Math.Max(1, _options.PollIntervalSeconds)),
                    stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Translation worker polling failed.");
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }
        }
    }
}
