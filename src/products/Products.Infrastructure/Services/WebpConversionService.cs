using Microsoft.EntityFrameworkCore;
using System.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Minio;
using Minio.DataModel.Args;
using Minio.Exceptions;
using Products.Infrastructure.Persistence;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;

namespace Products.Infrastructure.Services;

public sealed class WebpConversionOptions
{
    public int Quality { get; set; } = 80;
    public int DelayMilliseconds { get; set; } = 150;
    public int BatchSize { get; set; } = 25;
    public int DelayBetweenBatchesMilliseconds { get; set; } = 500;
    public long MaxPixels { get; set; } = 12_000_000;
}

public sealed record WebpConversionStatus(
    Guid Id, string Status, int Processed, int Total, int Converted, int Skipped,
    int Failed, long OriginalBytes, long WebpBytes, string? LastError,
    DateTimeOffset StartedAt, DateTimeOffset? CompletedAt);

public sealed class WebpConversionService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IMinioClient _minio;
    private readonly ProductImageStorageSettings _storage;
    private readonly WebpConversionOptions _options;
    private readonly ILogger<WebpConversionService> _logger;
    private readonly SemaphoreSlim _signal = new(0);
    private readonly object _sync = new();
    private WebpConversionStatus? _status;
    private CancellationTokenSource? _cancel;

    public WebpConversionService(IServiceScopeFactory scopeFactory, IMinioClient minio,
        IOptions<ProductImageStorageSettings> storage, IOptions<WebpConversionOptions> options,
        ILogger<WebpConversionService> logger)
    {
        _scopeFactory = scopeFactory;
        _minio = minio;
        _storage = storage.Value;
        _options = options.Value;
        _logger = logger;
    }

    public WebpConversionStatus? Current { get { lock (_sync) return _status; } }

    public WebpConversionStatus? Start()
    {
        lock (_sync)
        {
            if (_status?.Status is "Pending" or "Scanning" or "Running") return null;
            _cancel?.Dispose();
            _cancel = new CancellationTokenSource();
            _status = new WebpConversionStatus(Guid.NewGuid(), "Pending", 0, 0, 0, 0, 0, 0, 0, null, DateTimeOffset.UtcNow, null);
            _signal.Release();
            return _status;
        }
    }

    public WebpConversionStatus? Cancel()
    {
        lock (_sync)
        {
            if (_status?.Status is "Pending" or "Scanning" or "Running") _cancel?.Cancel();
            return _status;
        }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try { await _signal.WaitAsync(stoppingToken); }
            catch (OperationCanceledException) { break; }
            CancellationToken jobToken;
            lock (_sync) jobToken = _cancel!.Token;
            using var linked = CancellationTokenSource.CreateLinkedTokenSource(stoppingToken, jobToken);
            try
            {
                _logger.LogInformation("WebP conversion started: {JobId}", Current?.Id);
                await RunAsync(linked.Token);
                Update(s => s with { Status = s.Failed == 0 ? "Completed" : "CompletedWithErrors", CompletedAt = DateTimeOffset.UtcNow });
                _logger.LogInformation("WebP conversion completed: {JobId}, {Processed}/{Total}, {Converted} converted, {Failed} failed",
                    Current?.Id, Current?.Processed, Current?.Total, Current?.Converted, Current?.Failed);
            }
            catch (OperationCanceledException) when (linked.IsCancellationRequested)
            {
                Update(s => s with { Status = "Cancelled", CompletedAt = DateTimeOffset.UtcNow });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "WebP conversion job failed");
                Update(s => s with { Status = "Failed", LastError = ex.Message, CompletedAt = DateTimeOffset.UtcNow });
            }
        }
    }

    private async Task RunAsync(CancellationToken ct)
    {
        Update(s => s with { Status = "Scanning" });
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ProductsDbContext>();
        // Only DB referenced local images are candidates. URLs are lightweight even for a large catalogue.
        var productUrls = await db.Products.AsNoTracking().Select(x => new { x.Id, x.LocalImageUrl, x.ImageUrl }).ToListAsync(ct);
        var galleryUrls = await db.ProductImages.AsNoTracking().Select(x => new { x.ProductId, x.ImageUrl }).ToListAsync(ct);
        var candidates = new Dictionary<string, Candidate>(StringComparer.Ordinal);
        var webpReferences = new HashSet<Guid>();
        foreach (var row in productUrls)
        {
            AddCandidate(candidates, row.Id, row.LocalImageUrl);
            AddCandidate(candidates, row.Id, row.ImageUrl);
            if (IsWebpReference(row.Id, row.LocalImageUrl) || IsWebpReference(row.Id, row.ImageUrl))
                webpReferences.Add(row.Id);
        }
        foreach (var row in galleryUrls)
        {
            AddCandidate(candidates, row.ProductId, row.ImageUrl);
            if (IsWebpReference(row.ProductId, row.ImageUrl)) webpReferences.Add(row.ProductId);
        }
        // A previous run may have updated the DB just before shutdown, leaving an unreferenced source.
        // Find only those old objects whose product already points to WebP and finish their cleanup.
        var listArgs = new ListObjectsArgs().WithBucket(_storage.Bucket).WithPrefix("product-images/").WithRecursive(true);
        await foreach (var obj in _minio.ListObjectsEnumAsync(listArgs, ct).WithCancellation(ct))
        {
            if (obj.IsDir) continue;
            var parts = obj.Key.Split('/');
            if (parts.Length != 3 || !Guid.TryParse(parts[1], out var productId)
                || !webpReferences.Contains(productId)
                || parts[2] is not ("main.jpg" or "main.jpeg" or "main.png")) continue;
            var oldUrl = $"/api/products/{productId:D}/image/{parts[2]}";
            AddCandidate(candidates, productId, oldUrl);
        }
        Update(s => s with { Status = "Running", Total = candidates.Count });
        foreach (var candidate in candidates.Values)
        {
            ct.ThrowIfCancellationRequested();
            try
            {
                var result = await ConvertOneAsync(db, candidate, ct);
                Update(s => s with
                {
                    Processed = s.Processed + 1,
                    Converted = s.Converted + (result.Converted ? 1 : 0),
                    Skipped = s.Skipped + (result.Converted ? 0 : 1),
                    OriginalBytes = s.OriginalBytes + result.OriginalBytes,
                    WebpBytes = s.WebpBytes + result.WebpBytes,
                });
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested) { throw; }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not convert product image {Key}", candidate.SourceKey);
                Update(s => s with { Processed = s.Processed + 1, Failed = s.Failed + 1, LastError = $"{candidate.SourceKey}: {ex.Message}" });
            }
            if (_options.DelayMilliseconds > 0) await Task.Delay(_options.DelayMilliseconds, ct);
            if (_options.BatchSize > 0 && Current?.Processed % _options.BatchSize == 0
                && _options.DelayBetweenBatchesMilliseconds > 0)
                await Task.Delay(_options.DelayBetweenBatchesMilliseconds, ct);
        }
    }

    private static void AddCandidate(Dictionary<string, Candidate> candidates, Guid productId, string? url)
    {
        if (string.IsNullOrWhiteSpace(url)) return;
        var prefix = $"/api/products/{productId:D}/image/";
        if (!url.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) return;
        var name = url[prefix.Length..];
        if (name.ToLowerInvariant() is not ("main.jpg" or "main.jpeg" or "main.png")) return;
        var key = $"product-images/{productId:D}/{name}";
        candidates.TryAdd(key, new Candidate(productId, url, key, $"{prefix}main.webp", $"product-images/{productId:D}/main.webp"));
    }

    private static bool IsWebpReference(Guid productId, string? url) =>
        string.Equals(url, $"/api/products/{productId:D}/image/main.webp", StringComparison.OrdinalIgnoreCase);

    private async Task<ConversionResult> ConvertOneAsync(ProductsDbContext db, Candidate item, CancellationToken ct)
    {
        var timer = Stopwatch.StartNew();
        long originalBytes = 0;
        long webpBytes = 0;
        var alreadyWebp = await ValidWebpExistsAsync(item.WebpKey, ct);
        if (!alreadyWebp)
        {
            using var source = await DownloadAsync(item.SourceKey, ct);
            originalBytes = source.Length;
            using var output = await WebpImageCodec.ConvertAsync(source, _options.Quality, _options.MaxPixels, ct);
            webpBytes = output.Length;
            output.Position = 0;
            await _minio.PutObjectAsync(new PutObjectArgs().WithBucket(_storage.Bucket).WithObject(item.WebpKey)
                .WithStreamData(output).WithObjectSize(output.Length).WithContentType("image/webp"), ct);
            var stat = await _minio.StatObjectAsync(new StatObjectArgs().WithBucket(_storage.Bucket).WithObject(item.WebpKey), ct);
            if (stat.Size == 0) throw new IOException("Новый WebP объект пуст.");
        }

        // Update only exact local URLs. External original URLs are deliberately preserved.
        await db.Products.Where(x => x.Id == item.ProductId && x.LocalImageUrl == item.OldUrl)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.LocalImageUrl, item.NewUrl), ct);
        await db.Products.Where(x => x.Id == item.ProductId && x.ImageUrl == item.OldUrl)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.ImageUrl, item.NewUrl), ct);
        await db.ProductImages.Where(x => x.ProductId == item.ProductId && x.ImageUrl == item.OldUrl)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.ImageUrl, item.NewUrl), ct);

        var remaining = await db.Products.AnyAsync(x => x.Id == item.ProductId &&
            (x.LocalImageUrl == item.OldUrl || x.ImageUrl == item.OldUrl), ct)
            || await db.ProductImages.AnyAsync(x => x.ProductId == item.ProductId && x.ImageUrl == item.OldUrl, ct);
        if (remaining) throw new IOException("Старая ссылка всё ещё используется.");
        await _minio.RemoveObjectAsync(new RemoveObjectArgs().WithBucket(_storage.Bucket).WithObject(item.SourceKey), ct);
        _logger.LogDebug("Original deleted: {ObjectKey}", item.SourceKey);
        _logger.LogInformation("Image {Action}: {ObjectKey}, source extension {Extension}, source bytes {OriginalBytes}, WebP bytes {WebpBytes}, duration {ElapsedMs}ms",
            alreadyWebp ? "skipped" : "converted", item.SourceKey, Path.GetExtension(item.SourceKey), originalBytes, webpBytes, timer.ElapsedMilliseconds);
        return new ConversionResult(!alreadyWebp, originalBytes, webpBytes);
    }

    private async Task<bool> ValidWebpExistsAsync(string key, CancellationToken ct)
    {
        try
        {
            using var data = await DownloadAsync(key, ct);
            data.Position = 0;
            var info = await Image.IdentifyAsync(data, ct);
            return info?.Metadata.DecodedImageFormat?.Name.Equals("Webp", StringComparison.OrdinalIgnoreCase) == true;
        }
        catch (ObjectNotFoundException) { return false; }
        catch (InvalidDataException) { return false; }
        catch (UnknownImageFormatException) { return false; }
    }

    private async Task<MemoryStream> DownloadAsync(string key, CancellationToken ct)
    {
        var stat = await _minio.StatObjectAsync(new StatObjectArgs().WithBucket(_storage.Bucket).WithObject(key), ct);
        if (stat.Size is <= 0 or > ProductImageStorage.MaxImageBytes)
            throw new InvalidDataException("Размер изображения должен быть от 1 байта до 20 МБ.");
        var data = new MemoryStream((int)stat.Size);
        try
        {
            await _minio.GetObjectAsync(new GetObjectArgs().WithBucket(_storage.Bucket).WithObject(key)
                .WithCallbackStream(stream =>
                {
                    var buffer = new byte[81920];
                    int read;
                    while ((read = stream.Read(buffer)) > 0)
                    {
                        ct.ThrowIfCancellationRequested();
                        if (data.Length + read > ProductImageStorage.MaxImageBytes) throw new InvalidDataException("Изображение превышает 20 МБ.");
                        data.Write(buffer, 0, read);
                    }
                }), ct);
            return data;
        }
        catch { data.Dispose(); throw; }
    }

    private void Update(Func<WebpConversionStatus, WebpConversionStatus> change)
    {
        lock (_sync) if (_status is not null) _status = change(_status);
    }

    private sealed record Candidate(Guid ProductId, string OldUrl, string SourceKey, string NewUrl, string WebpKey);
    private sealed record ConversionResult(bool Converted, long OriginalBytes, long WebpBytes);
}

internal static class WebpImageCodec
{
    public static async Task<MemoryStream> ConvertAsync(Stream source, int quality, long maxPixels, CancellationToken ct)
    {
        var info = await Image.IdentifyAsync(source, ct) ?? throw new InvalidDataException("Неизвестный формат изображения.");
        if ((long)info.Width * info.Height > maxPixels)
            throw new InvalidDataException("Изображение превышает ограничение по пикселям.");
        source.Position = 0;
        using var image = await Image.LoadAsync(source, ct);
        var output = new MemoryStream();
        try
        {
            await image.SaveAsWebpAsync(output, new WebpEncoder { Quality = Math.Clamp(quality, 1, 100) }, ct);
            output.Position = 0;
            return output;
        }
        catch { output.Dispose(); throw; }
    }
}
