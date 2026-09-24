namespace ZozoEnrichmentTester.Models;

public enum ParseStatus
{
    Pending,
    Processing,
    Completed,
    Failed,
    Blocked,
}

public sealed record ImportRegistration(
    long ImportId,
    int TotalRows,
    int UniqueRows,
    int NewProducts,
    int AlreadyCompleted,
    IReadOnlyList<string> UrlChanges,
    IReadOnlyList<string> DuplicateUrls);

public sealed record ProcessingProduct(string ProductId, string SourceUrl);

public sealed record ImportTotals(int Processed, int Succeeded, int Failed, int Blocked);
