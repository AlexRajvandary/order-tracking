using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Npgsql;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Domain.Entities;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Infrastructure.TelegramBot;

public sealed class TelegramOutboxNotifier : ITelegramAdminNotifier
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private readonly ITelegramOutboxRepository _outbox;
    private readonly IUnitOfWork _unitOfWork;
    private readonly TelegramAdminBotService _bot;
    private readonly IDateTimeProvider _dateTime;
    private readonly ILogger<TelegramOutboxNotifier> _logger;

    public TelegramOutboxNotifier(
        ITelegramOutboxRepository outbox,
        IUnitOfWork unitOfWork,
        TelegramAdminBotService bot,
        IDateTimeProvider dateTime,
        ILogger<TelegramOutboxNotifier> logger)
    {
        _outbox = outbox;
        _unitOfWork = unitOfWork;
        _bot = bot;
        _dateTime = dateTime;
        _logger = logger;
    }

    public bool IsEnabled => _bot.IsEnabled;

    public async Task NotifyOrderCreatedAsync(
        Guid orderId,
        string trackingCode,
        string? customerName,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled)
        {
            return;
        }

        var payload = new TelegramOrderCreatedPayload(orderId, trackingCode, customerName);
        _outbox.Add(new TelegramOutboxMessage
        {
            Id = Guid.NewGuid(),
            Kind = TelegramOutboxKinds.OrderCreated,
            PayloadJson = JsonSerializer.Serialize(payload, JsonOptions),
            Status = TelegramOutboxStatus.Pending,
            CreatedAt = _dateTime.UtcNow,
        });

        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task NotifyStatusPublishedAsync(
        Guid orderId,
        string trackingCode,
        string statusText,
        string? orderItemName,
        string? country,
        string? location,
        Guid statusHistoryId,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled)
        {
            return;
        }

        var payload = new TelegramStatusPublishedPayload(
            orderId,
            trackingCode,
            statusText,
            orderItemName,
            country,
            location,
            statusHistoryId);

        _outbox.Add(new TelegramOutboxMessage
        {
            Id = Guid.NewGuid(),
            Kind = TelegramOutboxKinds.StatusPublished,
            PayloadJson = JsonSerializer.Serialize(payload, JsonOptions),
            Status = TelegramOutboxStatus.Pending,
            DedupKey = TelegramOutboxDedupKeys.StatusHistory(statusHistoryId),
            CreatedAt = _dateTime.UtcNow,
        });

        try
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            _logger.LogDebug(
                "Telegram outbox dedup: status history {HistoryId} already queued",
                statusHistoryId);
        }
    }

    private static bool IsUniqueViolation(DbUpdateException ex)
    {
        for (var inner = ex.InnerException; inner is not null; inner = inner.InnerException)
        {
            if (inner is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
            {
                return true;
            }
        }

        return false;
    }
}
