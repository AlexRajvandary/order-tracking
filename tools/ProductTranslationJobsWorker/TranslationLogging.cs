using Microsoft.Extensions.Logging;

namespace ProductTranslationJobsWorker;

internal static class TranslationLogging
{
    public static void LogTranslations(
        ILogger logger,
        Guid jobId,
        Guid batchId,
        IReadOnlyList<SaveTranslationItem> translations)
    {
        foreach (var translation in translations)
        {
            logger.LogDebug(
                "[OpenAI] translation: jobId={JobId}; batchId={BatchId}; id={ProductId}; translated_name={TranslatedName}",
                jobId,
                batchId,
                translation.Id,
                translation.NameRu);
        }
    }
}
