using Products.Domain.Enums;

namespace Products.Domain.Entities;

public sealed class TranslationJobItem
{
    public Guid Id { get; set; }

    public Guid JobId { get; set; }

    public TranslationJob Job { get; set; } = null!;

    public Guid? BatchId { get; set; }

    public TranslationJobBatch? Batch { get; set; }

    public Guid ProductId { get; set; }

    public TranslationJobItemStatus Status { get; set; }

    public int Attempts { get; set; }

    public string? OriginalName { get; set; }

    public string? TranslatedName { get; set; }

    public string? LastError { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset? StartedAt { get; set; }

    public DateTimeOffset? CompletedAt { get; set; }
}
