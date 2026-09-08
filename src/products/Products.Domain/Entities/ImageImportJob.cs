using Products.Domain.Enums;

namespace Products.Domain.Entities;

public sealed class ImageImportJob
{
    public Guid Id { get; set; }
    public ImageImportJobScope Scope { get; set; }
    public ImageImportJobStatus Status { get; set; }
    public int Parallelism { get; set; }
    public int TotalItems { get; set; }
    public int ProcessedItems { get; set; }
    public int SucceededItems { get; set; }
    public int FailedItems { get; set; }
    public long ImportedBytes { get; set; }
    public string? LastError { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public DateTimeOffset? StartedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public ICollection<ImageImportJobItem> Items { get; set; } = new List<ImageImportJobItem>();
}

public sealed class ImageImportJobItem
{
    public Guid Id { get; set; }
    public Guid JobId { get; set; }
    public ImageImportJob Job { get; set; } = null!;
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public bool Completed { get; set; }
    public bool Failed { get; set; }
    public string? Error { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
}
