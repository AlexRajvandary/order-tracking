using Products.Domain.Common;
using Products.Domain.Enums;

namespace Products.Domain.Entities;

public sealed class CrawlerJob : AuditableEntity
{
    public string Parser { get; set; } = "maketto";
    public string Url { get; set; } = string.Empty;
    public int RequestedPages { get; set; }
    public Guid CategoryId { get; set; }
    public Category Category { get; set; } = null!;
    public string CategoryPath { get; set; } = string.Empty;
    public CrawlerJobStatus Status { get; set; } = CrawlerJobStatus.Pending;
    public int ProcessedPages { get; set; }
    public int LastPage { get; set; }
    public int ProductsFound { get; set; }
    public int ImportedCount { get; set; }
    public int SkippedCount { get; set; }
    public int FailedCount { get; set; }
    public int AttemptCount { get; set; }
    public string? CreatedBy { get; set; }
    public string? LastError { get; set; }
    public DateTimeOffset? StartedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public DateTimeOffset? HeartbeatAt { get; set; }
    public ICollection<CrawlerJobLog> Logs { get; set; } = new List<CrawlerJobLog>();
}

public sealed class CrawlerJobLog : BaseEntity
{
    public Guid JobId { get; set; }
    public CrawlerJob Job { get; set; } = null!;
    public DateTimeOffset CreatedAt { get; set; }
    public string Level { get; set; } = "info";
    public string Message { get; set; } = string.Empty;
}
