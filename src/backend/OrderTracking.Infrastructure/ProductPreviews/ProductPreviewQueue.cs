using System.Collections.Concurrent;
using System.Threading.Channels;

namespace OrderTracking.Infrastructure.ProductPreviews;

public sealed record ProductPreviewWorkItem(Guid OrderItemId, string SourceUrl);

public sealed class ProductPreviewQueue
{
    private readonly Channel<ProductPreviewWorkItem> _channel = Channel.CreateBounded<ProductPreviewWorkItem>(
        new BoundedChannelOptions(256)
        {
            FullMode = BoundedChannelFullMode.DropWrite,
            SingleReader = true,
            SingleWriter = false,
        });
    private readonly ConcurrentDictionary<string, byte> _pending = new(StringComparer.Ordinal);

    public bool TryEnqueue(Guid orderItemId, string? sourceUrl)
    {
        if (string.IsNullOrWhiteSpace(sourceUrl))
        {
            return false;
        }

        var normalized = sourceUrl.Trim();
        var key = $"{orderItemId:N}:{normalized}";
        if (!_pending.TryAdd(key, 0))
        {
            return false;
        }

        if (_channel.Writer.TryWrite(new ProductPreviewWorkItem(orderItemId, normalized)))
        {
            return true;
        }

        _pending.TryRemove(key, out _);
        return false;
    }

    public IAsyncEnumerable<ProductPreviewWorkItem> ReadAllAsync(CancellationToken cancellationToken) =>
        _channel.Reader.ReadAllAsync(cancellationToken);

    public void Complete(ProductPreviewWorkItem item) =>
        _pending.TryRemove($"{item.OrderItemId:N}:{item.SourceUrl}", out _);
}
