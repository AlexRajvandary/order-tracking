using Products.Domain.Enums;

namespace Products.Domain.Entities;

public sealed class TranslationJobBatch
{
    public Guid Id { get; set; }

    public Guid JobId { get; set; }

    public TranslationJob Job { get; set; } = null!;

    public int BatchNumber { get; set; }

    public TranslationJobBatchStatus Status { get; set; }

    public int ItemCount { get; set; }

    public int Attempt { get; set; }

    public long PromptTokens { get; set; }

    public long CompletionTokens { get; set; }

    public long ReasoningTokens { get; set; }

    public long TotalTokens { get; set; }

    public long DurationMs { get; set; }

    public string? OpenAiRequestId { get; set; }

    public string? Error { get; set; }

    public DateTimeOffset? StartedAt { get; set; }

    public DateTimeOffset? CompletedAt { get; set; }
}
