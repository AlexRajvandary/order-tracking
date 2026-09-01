namespace Products.Domain.Enums;

public enum TranslationJobStatus
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
