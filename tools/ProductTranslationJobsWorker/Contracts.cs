using System.Text.Json.Serialization;
using Products.Domain.Enums;

namespace ProductTranslationJobsWorker;

public sealed record TranslationWorkerJobDto(
    Guid Id,
    TranslationJobScope Scope,
    TranslationJobStatus Status,
    int Parallelism,
    int BatchSize,
    string Model);

public sealed record TranslationWorkerBatchDto(
    Guid Id,
    int BatchNumber,
    int Attempt,
    int ItemCount);

public sealed record TranslationSourceDto(Guid Id, string Name);

public sealed record SaveTranslationRequest(
    IReadOnlyList<SaveTranslationItem> Items,
    bool OnlyIfUntranslated = false);

public sealed record SaveTranslationItem(Guid Id, string NameRu);

public sealed record CompleteTranslationBatchRequest(
    IReadOnlyList<SaveTranslationItem> Items,
    long PromptTokens,
    long CompletionTokens,
    long ReasoningTokens,
    long TotalTokens,
    long DurationMs,
    string? OpenAiRequestId,
    int FailedCount,
    string? Error);

public sealed record WorkerFailureRequest(string Error);

public sealed record OpenAiChatCompletionRequest
{
    [JsonPropertyName("model")]
    public required string Model { get; init; }

    [JsonPropertyName("reasoning_effort")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? ReasoningEffort { get; init; }

    [JsonPropertyName("messages")]
    public required IReadOnlyList<OpenAiChatMessage> Messages { get; init; }

    [JsonPropertyName("response_format")]
    public required OpenAiResponseFormat ResponseFormat { get; init; }
}

public sealed record OpenAiChatMessage
{
    [JsonPropertyName("role")]
    public required string Role { get; init; }

    [JsonPropertyName("content")]
    public required string Content { get; init; }
}

public sealed record OpenAiResponseFormat
{
    [JsonPropertyName("type")]
    public string Type { get; init; } = "json_schema";

    [JsonPropertyName("json_schema")]
    public required OpenAiJsonSchemaContainer JsonSchema { get; init; }
}

public sealed record OpenAiJsonSchemaContainer
{
    [JsonPropertyName("name")]
    public string Name { get; init; } = "product_translations";

    [JsonPropertyName("strict")]
    public bool Strict { get; init; } = true;

    [JsonPropertyName("schema")]
    public required OpenAiTranslationSchema Schema { get; init; }
}

public sealed record OpenAiTranslationSchema
{
    [JsonPropertyName("type")]
    public string Type { get; init; } = "object";

    [JsonPropertyName("properties")]
    public required OpenAiTranslationSchemaProperties Properties { get; init; }

    [JsonPropertyName("required")]
    public IReadOnlyList<string> Required { get; init; } = ["translations"];

    [JsonPropertyName("additionalProperties")]
    public bool AdditionalProperties { get; init; }
}

public sealed record OpenAiTranslationSchemaProperties
{
    [JsonPropertyName("translations")]
    public required OpenAiTranslationArraySchema Translations { get; init; }
}

public sealed record OpenAiTranslationArraySchema
{
    [JsonPropertyName("type")]
    public string Type { get; init; } = "array";

    [JsonPropertyName("minItems")]
    public int MinItems { get; init; }

    [JsonPropertyName("maxItems")]
    public int MaxItems { get; init; }

    [JsonPropertyName("items")]
    public required OpenAiTranslationItemSchema Items { get; init; }
}

public sealed record OpenAiTranslationItemSchema
{
    [JsonPropertyName("type")]
    public string Type { get; init; } = "object";

    [JsonPropertyName("properties")]
    public required OpenAiTranslationItemProperties Properties { get; init; }

    [JsonPropertyName("required")]
    public IReadOnlyList<string> Required { get; init; } = ["id", "translation"];

    [JsonPropertyName("additionalProperties")]
    public bool AdditionalProperties { get; init; }
}

public sealed record OpenAiTranslationItemProperties
{
    [JsonPropertyName("id")]
    public OpenAiStringSchema Id { get; init; } = new();

    [JsonPropertyName("translation")]
    public OpenAiStringSchema Translation { get; init; } = new();
}

public sealed record OpenAiStringSchema
{
    [JsonPropertyName("type")]
    public string Type { get; init; } = "string";
}

public sealed record OpenAiChatCompletionResponse
{
    [JsonPropertyName("id")]
    public string? Id { get; init; }

    [JsonPropertyName("choices")]
    public IReadOnlyList<OpenAiChoice>? Choices { get; init; }

    [JsonPropertyName("usage")]
    public OpenAiUsage? Usage { get; init; }
}

public sealed record OpenAiChoice
{
    [JsonPropertyName("message")]
    public OpenAiMessage? Message { get; init; }
}

public sealed record OpenAiMessage
{
    [JsonPropertyName("content")]
    public string? Content { get; init; }
}

public sealed record OpenAiUsage
{
    [JsonPropertyName("prompt_tokens")]
    public long PromptTokens { get; init; }

    [JsonPropertyName("completion_tokens")]
    public long CompletionTokens { get; init; }

    [JsonPropertyName("total_tokens")]
    public long TotalTokens { get; init; }

    [JsonPropertyName("completion_tokens_details")]
    public OpenAiCompletionTokenDetails? CompletionTokensDetails { get; init; }
}

public sealed record OpenAiCompletionTokenDetails
{
    [JsonPropertyName("reasoning_tokens")]
    public long ReasoningTokens { get; init; }
}

public sealed record ProductTranslationResponse
{
    [JsonPropertyName("translations")]
    public IReadOnlyList<ProductTranslationItem>? Translations { get; init; }
}

public sealed record ProductTranslationItem
{
    [JsonPropertyName("id")]
    public string? Id { get; init; }

    [JsonPropertyName("translation")]
    public string? Translation { get; init; }
}

public sealed record OpenAiTranslationResult(
    IReadOnlyList<SaveTranslationItem> Items,
    long PromptTokens,
    long CompletionTokens,
    long TotalTokens,
    long ReasoningTokens,
    long DurationMs,
    string? RequestId);
