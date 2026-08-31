using System.Collections.Concurrent;
using System.Net;
namespace ProductTranslationWorker;

public sealed record NetworkTrafficSnapshot(long UploadedBytes, long DownloadedBytes, double CurrentBytesPerSecond, double AverageBytesPerSecond, long ProcessedProducts, long? EstimatedTotalBytes, long? EstimatedRemainingBytes)
{
    public long TotalBytes => UploadedBytes + DownloadedBytes;
    public double? BytesPerProduct => ProcessedProducts > 0 ? (double)TotalBytes / ProcessedProducts : null;
}

public sealed class NetworkTrafficTracker
{
    private readonly long startedAt = Environment.TickCount64; private long uploaded, downloaded, processed; private readonly ConcurrentQueue<(long At, long Bytes)> samples = new();

    public void Add(long up, long down)
    {
        Interlocked.Add(ref uploaded, up);
        Interlocked.Add(ref downloaded, down);
        var now = Environment.TickCount64;
        samples.Enqueue((now, up + down));

        while (samples.TryPeek(out var x) && now - x.At > 60000)
            samples.TryDequeue(out _);
    }

    public void SetProcessed(long count) => Interlocked.Exchange(ref processed, count);

    public NetworkTrafficSnapshot Snapshot(long totalProducts)
    {
        var now = Environment.TickCount64;
        while (samples.TryPeek(out var x) && now - x.At > 60000)
            samples.TryDequeue(out _);

        var window = samples.ToArray();
        var windowBytes = window.Sum(x => x.Bytes);
        var span = window.Length > 1 ? Math.Max(1, now - window[0].At) : Math.Max(1, now - startedAt);
        var total = Interlocked.Read(ref uploaded) + Interlocked.Read(ref downloaded);
        var done = Interlocked.Read(ref processed);
        long? estimate = done >= 3 && done > 0 ? (long)Math.Ceiling((double)total / done * totalProducts) : null;

        return new(Interlocked.Read(ref uploaded),
                   Interlocked.Read(ref downloaded),
                   windowBytes / (span / 1000d),
                   total / (Math.Max(1, (now - startedAt)) / 1000d),
                   done,
                   estimate,
                   estimate.HasValue
                    ? Math.Max(0, estimate.Value - total)
                    : null);
    }
}

public sealed class VpsTrafficHandler(NetworkTrafficTracker tracker) : DelegatingHandler
{
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        long uploaded = 0;

        if (request.Content is not null)
        {
            var original = request.Content;
            var bytes = await original.ReadAsByteArrayAsync(cancellationToken);
            uploaded = bytes.LongLength;
            var replacement = new ByteArrayContent(bytes);

            foreach (var h in original.Headers)
                replacement.Headers.TryAddWithoutValidation(h.Key, h.Value);

            request.Content = replacement;
        }

        var response = await base.SendAsync(request, cancellationToken);
        var originalResponse = response.Content;
        var body = await originalResponse.ReadAsByteArrayAsync(cancellationToken);
        tracker.Add(uploaded, body.LongLength);
        var responseContent = new ByteArrayContent(body);

        foreach (var h in originalResponse.Headers)
            responseContent.Headers.TryAddWithoutValidation(h.Key, h.Value);

        response.Content = responseContent; return response;
    }
}

public static class ByteFormatting
{
    public static string Bytes(double value)
    {
        var units = new[] { "B", "KB", "MB", "GB" };
        var i = 0;
        while (value >= 1024 && i < units.Length - 1)
        {
            value /= 1024; i++;
        }

        return $"{(i == 0 ? value.ToString("0") : value.ToString("0.##"))} {units[i]}";
    }

    public static string Rate(double value) => $"{Bytes(value)}/s";
}
