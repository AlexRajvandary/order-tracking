using System.Collections.Concurrent;
using System.Threading.Channels;
using Telegram.Bot.Types;

namespace OrderTracking.Infrastructure.TelegramBot;

/// <summary>
/// In-process queue so webhook HTTP returns quickly and domain handlers
/// do not wait on Telegram I/O.
/// </summary>
public sealed class TelegramWorkQueue
{
    private readonly Channel<TelegramWorkItem> _channel = Channel.CreateUnbounded<TelegramWorkItem>(
        new UnboundedChannelOptions
        {
            SingleReader = true,
            SingleWriter = false,
            AllowSynchronousContinuations = false,
        });

    private readonly ConcurrentDictionary<int, long> _seenUpdateIds = new();

    public bool EnqueueUpdate(Update update)
    {
        // Drop Telegram retries for the same update_id while the first is queued/processing.
        if (!_seenUpdateIds.TryAdd(update.Id, Environment.TickCount64))
        {
            return false;
        }

        TrimSeenUpdates();
        return _channel.Writer.TryWrite(new TelegramUpdateWorkItem(update));
    }

    internal bool Enqueue(TelegramWorkItem item) => _channel.Writer.TryWrite(item);

    internal IAsyncEnumerable<TelegramWorkItem> ReadAllAsync(CancellationToken cancellationToken) =>
        _channel.Reader.ReadAllAsync(cancellationToken);

    private void TrimSeenUpdates()
    {
        if (_seenUpdateIds.Count < 2_000)
        {
            return;
        }

        var cutoff = Environment.TickCount64 - (long)TimeSpan.FromHours(1).TotalMilliseconds;
        foreach (var pair in _seenUpdateIds)
        {
            if (pair.Value < cutoff)
            {
                _seenUpdateIds.TryRemove(pair.Key, out _);
            }
        }
    }
}
