using Products.Domain.Enums;

namespace Products.Domain.Entities;

public sealed class TranslationJob
{
    public Guid Id { get; set; }

    public TranslationJobScope Scope { get; set; }

    public TranslationJobStatus Status { get; set; }

    public int Parallelism { get; set; }

    public int BatchSize { get; set; }

    public int TotalItems { get; set; }

    public int ProcessedItems { get; set; }

    public int SucceededItems { get; set; }

    public int FailedItems { get; set; }

    public long PromptTokens { get; set; }

    public long CompletionTokens { get; set; }

    public long ReasoningTokens { get; set; }

    public long TotalTokens { get; set; }

    public string Model { get; set; } = string.Empty;

    public string? PromptVersion { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset? StartedAt { get; set; }

    public DateTimeOffset? CompletedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    public string? LastError { get; set; }

    public ICollection<TranslationJobItem> Items { get; set; } = new List<TranslationJobItem>();

    public ICollection<TranslationJobBatch> Batches { get; set; } = new List<TranslationJobBatch>();
}
