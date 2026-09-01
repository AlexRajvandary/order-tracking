using System.Diagnostics;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Encodings.Web;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ProductTranslationJobsWorker;

public sealed class OpenAiTranslationClient
{
    private static readonly JsonSerializerOptions JsonOptions = CreateJsonOptions();

    private readonly HttpClient _httpClient;

    private readonly OpenAiOptions _openAiOptions;

    private readonly TranslationJobsOptions _jobOptions;

    private readonly ILogger<OpenAiTranslationClient> _logger;

    public OpenAiTranslationClient(
        HttpClient httpClient,
        IOptions<OpenAiOptions> openAiOptions,
        IOptions<TranslationJobsOptions> jobOptions,
        ILogger<OpenAiTranslationClient> logger)
    {
        _httpClient = httpClient;
        _openAiOptions = openAiOptions.Value;
        _jobOptions = jobOptions.Value;
        _logger = logger;
    }

    public async Task CheckConnectionAsync(CancellationToken cancellationToken)
    {
        EnsureApiKey();
        using var request = new HttpRequestMessage(HttpMethod.Get, "v1/models");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _openAiOptions.ApiKey);
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException(
                $"OpenAI connection failed with {(int)response.StatusCode}: {body}");
        }
    }

    public async Task<OpenAiTranslationResult> TranslateAsync(
        IReadOnlyList<TranslationSourceDto> products,
        string model,
        CancellationToken cancellationToken)
    {
        EnsureApiKey();
        if (products.Count == 0)
        {
            throw new ArgumentException("A translation batch cannot be empty.", nameof(products));
        }

        var pending = products.ToList();
        var translated = new Dictionary<Guid, SaveTranslationItem>();
        var stopwatch = Stopwatch.StartNew();
        long promptTokens = 0;
        long completionTokens = 0;
        long reasoningTokens = 0;
        long totalTokens = 0;
        string? requestId = null;
        var validationAttempts = 0;
        var maxValidationRetries = Math.Max(0, _jobOptions.MaxRetries);

        while (pending.Count > 0)
        {
            var request = CreateRequest(pending, model);
            var response = await SendWithRetryAsync(request, cancellationToken);
            var usage = response.Usage ?? new OpenAiUsage();
            var requestReasoningTokens = usage.CompletionTokensDetails?.ReasoningTokens ?? 0;
            promptTokens += usage.PromptTokens;
            completionTokens += usage.CompletionTokens;
            reasoningTokens += requestReasoningTokens;
            totalTokens += usage.TotalTokens;
            requestId = response.Id ?? requestId;
            _logger.LogInformation(
                "[OpenAI] input={Input}; output={Output}; reasoning={Reasoning}; total={Total}; products={Products}; requestId={RequestId}",
                usage.PromptTokens,
                usage.CompletionTokens,
                requestReasoningTokens,
                usage.TotalTokens,
                pending.Count,
                response.Id);

            ProductTranslationResponse? parsed;
            try
            {
                parsed = ParseResponse(response);
            }
            catch (InvalidDataException exception)
            {
                if (validationAttempts >= maxValidationRetries)
                {
                    throw;
                }

                validationAttempts++;
                _logger.LogWarning(
                    exception,
                    "OpenAI returned an invalid response; retrying the {ProductCount} products.",
                    pending.Count);
                continue;
            }

            try
            {
                var validated = TranslationValidation.Validate(pending, parsed?.Translations);
                foreach (var item in validated)
                {
                    translated[item.Id] = item;
                }

                pending.Clear();
            }
            catch (InvalidDataException exception)
            {
                var partial = TranslationValidation.SelectUnambiguousValid(pending, parsed?.Translations);
                if (partial.Count == 0
                    || partial.Count >= pending.Count
                    || validationAttempts >= maxValidationRetries)
                {
                    throw;
                }

                foreach (var item in partial)
                {
                    translated[item.Id] = item;
                }

                var acceptedIds = partial.Select(x => x.Id).ToHashSet();
                pending = pending.Where(x => !acceptedIds.Contains(x.Id)).ToList();
                validationAttempts++;
                _logger.LogWarning(
                    exception,
                    "OpenAI response validation failed for {InvalidCount} products; retrying only missing or invalid products.",
                    pending.Count);
            }
        }

        stopwatch.Stop();
        return new OpenAiTranslationResult(
            translated.Values.ToList(),
            promptTokens,
            completionTokens,
            totalTokens,
            reasoningTokens,
            stopwatch.ElapsedMilliseconds,
            requestId);
    }

    private OpenAiChatCompletionRequest CreateRequest(
        IReadOnlyList<TranslationSourceDto> products,
        string model)
    {
        return new OpenAiChatCompletionRequest
        {
            Model = string.IsNullOrWhiteSpace(model) ? _openAiOptions.Model : model,
            ReasoningEffort = IsGpt5Model(model) ? "minimal" : null,
            Messages =
            [
                new OpenAiChatMessage
                {
                    Role = "system",
                    Content = TranslationPrompt.SystemMessage,
                },
                new OpenAiChatMessage
                {
                    Role = "user",
                    Content = TranslationPrompt.Build(products),
                },
            ],
            ResponseFormat = CreateResponseFormat(products.Count),
        };
    }

    private static bool IsGpt5Model(string model)
    {
        return model.StartsWith("gpt-5", StringComparison.OrdinalIgnoreCase);
    }

    private async Task<OpenAiChatCompletionResponse> SendWithRetryAsync(
        OpenAiChatCompletionRequest request,
        CancellationToken cancellationToken)
    {
        Exception? lastError = null;
        for (var attempt = 1; attempt <= Math.Max(1, _jobOptions.MaxRetries + 1); attempt++)
        {
            try
            {
                return await SendAsync(request, cancellationToken);
            }
            catch (Exception exception) when (IsTransient(exception) && attempt <= _jobOptions.MaxRetries)
            {
                lastError = exception;
                var delay = GetRetryDelay(exception, attempt);
                _logger.LogWarning(
                    exception,
                    "Transient OpenAI failure on attempt {Attempt}; retrying in {DelayMs} ms",
                    attempt,
                    delay.TotalMilliseconds);
                await Task.Delay(delay, cancellationToken);
            }
        }

        throw lastError ?? new InvalidOperationException("OpenAI request failed without an exception.");
    }

    private static ProductTranslationResponse? ParseResponse(OpenAiChatCompletionResponse response)
    {
        var content = response.Choices?.FirstOrDefault()?.Message?.Content;
        if (string.IsNullOrWhiteSpace(content))
        {
            throw new InvalidDataException("OpenAI response did not contain message content.");
        }

        try
        {
            return JsonSerializer.Deserialize<ProductTranslationResponse>(content, JsonOptions);
        }
        catch (JsonException exception)
        {
            throw new InvalidDataException("OpenAI returned invalid translation JSON.", exception);
        }
    }

    private async Task<OpenAiChatCompletionResponse> SendAsync(
        OpenAiChatCompletionRequest request,
        CancellationToken cancellationToken)
    {
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "v1/chat/completions");
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _openAiOptions.ApiKey);
        httpRequest.Content = JsonContent.Create(request, options: JsonOptions);
        using var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            var retryAfter = response.Headers.RetryAfter?.Delta;
            var remaining = response.Headers.TryGetValues("x-ratelimit-remaining-requests", out var remainingValues)
                ? remainingValues.FirstOrDefault()
                : null;
            var reset = response.Headers.TryGetValues("x-ratelimit-reset-requests", out var resetValues)
                ? resetValues.FirstOrDefault()
                : null;
            _logger.LogWarning(
                "OpenAI request failed with {StatusCode}; retryAfter={RetryAfter}; remainingRequests={Remaining}; resetRequests={Reset}",
                (int)response.StatusCode,
                retryAfter,
                remaining,
                reset);
            throw new OpenAiHttpException(response.StatusCode, retryAfter, body, remaining, reset);
        }

        return await response.Content.ReadFromJsonAsync<OpenAiChatCompletionResponse>(
            JsonOptions,
            cancellationToken)
            ?? throw new InvalidDataException("OpenAI returned an empty response.");
    }

    private TimeSpan GetRetryDelay(Exception exception, int attempt)
    {
        if (exception is OpenAiHttpException openAi && openAi.RetryAfter is not null)
        {
            return openAi.RetryAfter.Value;
        }

        var baseSeconds = Math.Max(1, _jobOptions.RetryBaseDelaySeconds);
        var seconds = Math.Min(60, baseSeconds * Math.Pow(2, attempt - 1));
        var jitter = Random.Shared.NextDouble() * Math.Max(1, baseSeconds);
        return TimeSpan.FromSeconds(seconds + jitter);
    }

    private static bool IsTransient(Exception exception)
    {
        return exception is OpenAiHttpException { StatusCode: HttpStatusCode.TooManyRequests or HttpStatusCode.RequestTimeout }
            || exception is OpenAiHttpException { StatusCode: >= HttpStatusCode.InternalServerError }
            || exception is HttpRequestException
            || exception is TaskCanceledException;
    }

    private static OpenAiResponseFormat CreateResponseFormat(int count)
    {
        return new OpenAiResponseFormat
        {
            JsonSchema = new OpenAiJsonSchemaContainer
            {
                Schema = new OpenAiTranslationSchema
                {
                    Properties = new OpenAiTranslationSchemaProperties
                    {
                        Translations = new OpenAiTranslationArraySchema
                        {
                            MinItems = count,
                            MaxItems = count,
                            Items = new OpenAiTranslationItemSchema
                            {
                                Properties = new OpenAiTranslationItemProperties(),
                            },
                        },
                    },
                },
            },
        };
    }

    private void EnsureApiKey()
    {
        if (string.IsNullOrWhiteSpace(_openAiOptions.ApiKey))
        {
            throw new InvalidOperationException("OpenAI:ApiKey is not configured.");
        }
    }

    private static JsonSerializerOptions CreateJsonOptions()
    {
        return new JsonSerializerOptions(JsonSerializerDefaults.Web)
        {
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        };
    }
}

public sealed class OpenAiHttpException : HttpRequestException
{
    public OpenAiHttpException(
        HttpStatusCode statusCode,
        TimeSpan? retryAfter,
        string body,
        string? remainingRequests,
        string? resetRequests)
        : base($"OpenAI returned {(int)statusCode}: {body[..Math.Min(body.Length, 500)]}", null, statusCode)
    {
        RetryAfter = retryAfter;
        RemainingRequests = remainingRequests;
        ResetRequests = resetRequests;
    }

    public TimeSpan? RetryAfter { get; }

    public string? RemainingRequests { get; }

    public string? ResetRequests { get; }
}
