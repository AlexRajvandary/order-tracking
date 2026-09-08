namespace Products.Domain.Enums;

public enum ImageImportJobStatus
{
    Pending,
    Running,
    PauseRequested,
    Paused,
    CancelRequested,
    Cancelled,
    Completed,
    CompletedWithErrors,
    Failed,
}

public enum ImageImportJobScope
{
    AllMissing,
    Selected,
}
