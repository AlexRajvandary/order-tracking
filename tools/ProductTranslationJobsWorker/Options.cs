namespace ProductTranslationJobsWorker;

public sealed class TranslationJobsOptions
{
    public string ApiUrl { get; set; } = "http://localhost:5281/api/translation-jobs";

    public string WorkerApiKey { get; set; } = string.Empty;

    public int PollIntervalSeconds { get; set; } = 5;

    public int MaxRetries { get; set; } = 3;

    public int RetryBaseDelaySeconds { get; set; } = 2;
}

public sealed class OpenAiOptions
{
    public string ApiKey { get; set; } = string.Empty;

    public string Model { get; set; } = "gpt-5-mini";

    public string BaseUrl { get; set; } = "https://api.openai.com/";

    public int TimeoutSeconds { get; set; } = 120;
}
