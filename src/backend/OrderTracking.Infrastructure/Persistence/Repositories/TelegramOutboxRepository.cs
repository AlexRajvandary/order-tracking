using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Domain.Entities;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Infrastructure.Persistence.Repositories;

public sealed class TelegramOutboxRepository : ITelegramOutboxRepository
{
    private readonly ApplicationDbContext _db;

    public TelegramOutboxRepository(ApplicationDbContext db)
    {
        _db = db;
    }

    public void Add(TelegramOutboxMessage message) => _db.TelegramOutboxMessages.Add(message);

    public Task<bool> ExistsByDedupAsync(
        string kind,
        string dedupKey,
        IReadOnlyList<TelegramOutboxStatus> statuses,
        CancellationToken cancellationToken = default) =>
        _db.TelegramOutboxMessages.AsNoTracking()
            .AnyAsync(
                m => m.Kind == kind
                     && m.DedupKey == dedupKey
                     && statuses.Contains(m.Status),
                cancellationToken);

    public Task<bool> ExistsByDedupKeyAndStatusAsync(
        string dedupKey,
        TelegramOutboxStatus status,
        CancellationToken cancellationToken = default) =>
        _db.TelegramOutboxMessages.AsNoTracking()
            .AnyAsync(m => m.DedupKey == dedupKey && m.Status == status, cancellationToken);

    public Task<int> RecoverStaleProcessingAsync(
        DateTimeOffset staleBefore,
        CancellationToken cancellationToken = default) =>
        _db.TelegramOutboxMessages
            .Where(m => m.Status == TelegramOutboxStatus.Processing
                        && m.LockedAt != null
                        && m.LockedAt < staleBefore)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(m => m.Status, TelegramOutboxStatus.Pending)
                    .SetProperty(m => m.LockedAt, (DateTimeOffset?)null),
                cancellationToken);

    /// <summary>
    /// Claims a batch in a short transaction. This repository intentionally commits the
    /// claim itself so the external Telegram send is never performed under a DB lock.
    /// </summary>
    public async Task<IReadOnlyList<TelegramOutboxMessage>> ClaimPendingBatchAsync(
        int batchSize,
        DateTimeOffset lockedAt,
        CancellationToken cancellationToken = default)
    {
        await using var tx = await _db.Database.BeginTransactionAsync(cancellationToken);

        var batch = await _db.TelegramOutboxMessages
            .FromSqlRaw(
                """
                SELECT *
                FROM telegram_outbox_messages
                WHERE "Status" = {0}
                ORDER BY "CreatedAt", "Id"
                FOR UPDATE SKIP LOCKED
                LIMIT {1}
                """,
                (short)TelegramOutboxStatus.Pending,
                batchSize)
            .AsTracking()
            .ToListAsync(cancellationToken);

        if (batch.Count == 0)
        {
            await tx.CommitAsync(cancellationToken);
            return batch;
        }

        foreach (var message in batch)
        {
            message.Status = TelegramOutboxStatus.Processing;
            message.LockedAt = lockedAt;
            message.AttemptCount += 1;
        }

        await _db.SaveChangesAsync(cancellationToken);
        await tx.CommitAsync(cancellationToken);

        return batch;
    }

    public Task MarkSentAsync(
        TelegramOutboxMessage message,
        DateTimeOffset processedAt,
        CancellationToken cancellationToken = default)
    {
        message.Status = TelegramOutboxStatus.Sent;
        message.ProcessedAt = processedAt;
        message.LastError = null;
        return Task.CompletedTask;
    }

    public Task MarkFailedAsync(
        TelegramOutboxMessage message,
        string error,
        int maxAttempts,
        CancellationToken cancellationToken = default)
    {
        message.LastError = error;
        message.Status = message.AttemptCount >= maxAttempts
            ? TelegramOutboxStatus.Dead
            : TelegramOutboxStatus.Pending;
        message.LockedAt = null;
        return Task.CompletedTask;
    }
}
