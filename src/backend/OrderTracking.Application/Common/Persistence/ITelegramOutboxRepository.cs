using OrderTracking.Domain.Entities;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Application.Common.Persistence;

public interface ITelegramOutboxRepository
{
    void Add(TelegramOutboxMessage message);

    Task<bool> ExistsByDedupAsync(
        string kind,
        string dedupKey,
        IReadOnlyList<TelegramOutboxStatus> statuses,
        CancellationToken cancellationToken = default);

    Task<bool> ExistsByDedupKeyAndStatusAsync(
        string dedupKey,
        TelegramOutboxStatus status,
        CancellationToken cancellationToken = default);

    Task<int> RecoverStaleProcessingAsync(
        DateTimeOffset staleBefore,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<TelegramOutboxMessage>> ClaimPendingBatchAsync(
        int batchSize,
        DateTimeOffset lockedAt,
        CancellationToken cancellationToken = default);

    Task MarkSentAsync(
        TelegramOutboxMessage message,
        DateTimeOffset processedAt,
        CancellationToken cancellationToken = default);

    Task MarkFailedAsync(
        TelegramOutboxMessage message,
        string error,
        int maxAttempts,
        CancellationToken cancellationToken = default);
}
