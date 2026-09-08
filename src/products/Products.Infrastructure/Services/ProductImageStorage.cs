using System.Net;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Minio;
using Minio.DataModel.Args;

namespace Products.Infrastructure.Services;

public sealed class ProductImageStorageSettings
{
    public const string SectionName = "Minio";
    public string Endpoint { get; set; } = "localhost:9000";
    public string AccessKey { get; set; } = "minioadmin";
    public string SecretKey { get; set; } = "minioadmin";
    public string Bucket { get; set; } = "order-tracking";
    public bool UseSsl { get; set; }
}

public sealed record StoredProductImage(string PublicUrl, long SizeBytes);

public sealed class ProductImageStorage
{
    public const long MaxImageBytes = 20 * 1024 * 1024;
    private readonly HttpClient _http;
    private readonly IMinioClient _minio;
    private readonly ProductImageStorageSettings _settings;
    private readonly ILogger<ProductImageStorage> _logger;
    private readonly SemaphoreSlim _bucketLock = new(1, 1);
    private bool _bucketReady;

    public ProductImageStorage(
        HttpClient http,
        IMinioClient minio,
        IOptions<ProductImageStorageSettings> settings,
        ILogger<ProductImageStorage> logger)
    {
        _http = http;
        _minio = minio;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<StoredProductImage> DownloadAndStoreAsync(
        Guid productId,
        string sourceUrl,
        CancellationToken cancellationToken)
    {
        if (!Uri.TryCreate(sourceUrl, UriKind.Absolute, out var uri)
            || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
            || !await IsPublicHostAsync(uri, cancellationToken))
        {
            throw new InvalidOperationException("Недопустимый URL изображения.");
        }

        using var response = await GetWithSafeRedirectsAsync(uri, cancellationToken);
        response.EnsureSuccessStatusCode();
        var contentType = response.Content.Headers.ContentType?.MediaType?.ToLowerInvariant();
        if (contentType is not ("image/jpeg" or "image/png" or "image/webp" or "image/gif" or "image/avif"))
        {
            throw new InvalidOperationException("URL не вернул изображение.");
        }

        if (response.Content.Headers.ContentLength is > MaxImageBytes)
        {
            throw new InvalidOperationException("Изображение превышает 20 МБ.");
        }

        await using var source = await response.Content.ReadAsStreamAsync(cancellationToken);
        await using var buffer = new MemoryStream();
        var chunk = new byte[81920];
        while (true)
        {
            var read = await source.ReadAsync(chunk, cancellationToken);
            if (read == 0) break;
            if (buffer.Length + read > MaxImageBytes)
            {
                throw new InvalidOperationException("Изображение превышает 20 МБ.");
            }
            await buffer.WriteAsync(chunk.AsMemory(0, read), cancellationToken);
        }

        if (buffer.Length == 0) throw new InvalidOperationException("Получено пустое изображение.");
        buffer.Position = 0;
        await EnsureBucketAsync(cancellationToken);
        var fileName = $"main.{ExtensionFor(contentType)}";
        var key = ObjectKey(productId, fileName);
        foreach (var oldFileName in AllowedFileNames.Where(name => !name.Equals(fileName, StringComparison.OrdinalIgnoreCase)))
        {
            await _minio.RemoveObjectAsync(
                new RemoveObjectArgs().WithBucket(_settings.Bucket).WithObject(ObjectKey(productId, oldFileName)),
                cancellationToken);
        }
        await _minio.PutObjectAsync(
            new PutObjectArgs()
                .WithBucket(_settings.Bucket)
                .WithObject(key)
                .WithStreamData(buffer)
                .WithObjectSize(buffer.Length)
                .WithContentType(contentType),
            cancellationToken);

        return new StoredProductImage($"/api/products/{productId}/image/{fileName}", buffer.Length);
    }

    public async Task<(Stream Content, string ContentType)> GetAsync(
        Guid productId,
        string fileName,
        CancellationToken cancellationToken)
    {
        if (!AllowedFileNames.Contains(fileName))
            throw new FileNotFoundException("Product image was not found.");
        await EnsureBucketAsync(cancellationToken);
        var key = ObjectKey(productId, fileName);
        var stat = await _minio.StatObjectAsync(
            new StatObjectArgs().WithBucket(_settings.Bucket).WithObject(key), cancellationToken);
        var stream = new MemoryStream();
        await _minio.GetObjectAsync(
            new GetObjectArgs().WithBucket(_settings.Bucket).WithObject(key)
                .WithCallbackStream(input => input.CopyTo(stream)), cancellationToken);
        stream.Position = 0;
        return (stream, stat.ContentType ?? "application/octet-stream");
    }

    private async Task EnsureBucketAsync(CancellationToken cancellationToken)
    {
        if (_bucketReady) return;
        await _bucketLock.WaitAsync(cancellationToken);
        try
        {
            if (_bucketReady) return;
            var exists = await _minio.BucketExistsAsync(
                new BucketExistsArgs().WithBucket(_settings.Bucket), cancellationToken);
            if (!exists)
            {
                await _minio.MakeBucketAsync(new MakeBucketArgs().WithBucket(_settings.Bucket), cancellationToken);
                _logger.LogInformation("Created MinIO bucket {Bucket}", _settings.Bucket);
            }
            _bucketReady = true;
        }
        finally
        {
            _bucketLock.Release();
        }
    }

    private static readonly HashSet<string> AllowedFileNames = new(StringComparer.OrdinalIgnoreCase)
    {
        "main.jpg", "main.png", "main.webp", "main.gif", "main.avif",
    };

    private static string ObjectKey(Guid productId, string fileName) =>
        $"product-images/{productId:D}/{fileName.ToLowerInvariant()}";

    private static string ExtensionFor(string contentType) => contentType switch
    {
        "image/jpeg" => "jpg",
        "image/png" => "png",
        "image/webp" => "webp",
        "image/gif" => "gif",
        "image/avif" => "avif",
        _ => throw new InvalidOperationException("Неподдерживаемый тип изображения."),
    };

    private async Task<HttpResponseMessage> GetWithSafeRedirectsAsync(Uri initialUri, CancellationToken cancellationToken)
    {
        var current = initialUri;
        for (var redirect = 0; redirect <= 3; redirect++)
        {
            if (!await IsPublicHostAsync(current, cancellationToken))
                throw new InvalidOperationException("Перенаправление изображения ведёт на недопустимый адрес.");

            var response = await _http.GetAsync(current, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
            if ((int)response.StatusCode is < 300 or >= 400) return response;

            var location = response.Headers.Location;
            response.Dispose();
            if (location is null) throw new InvalidOperationException("Сервер вернул некорректное перенаправление.");
            current = location.IsAbsoluteUri ? location : new Uri(current, location);
            if (current.Scheme != Uri.UriSchemeHttp && current.Scheme != Uri.UriSchemeHttps)
                throw new InvalidOperationException("Недопустимая схема перенаправления изображения.");
        }

        throw new InvalidOperationException("Слишком много перенаправлений изображения.");
    }

    private static async Task<bool> IsPublicHostAsync(Uri uri, CancellationToken cancellationToken)
    {
        try
        {
            var addresses = await Dns.GetHostAddressesAsync(uri.DnsSafeHost, cancellationToken);
            return addresses.Length > 0 && addresses.All(address =>
            {
                if (IPAddress.IsLoopback(address)) return false;
                if (address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetworkV6)
                    return !address.IsIPv6LinkLocal && !address.IsIPv6SiteLocal && !address.IsIPv6Multicast;
                var b = address.GetAddressBytes();
                return !(b[0] == 10 || b[0] == 127 || (b[0] == 169 && b[1] == 254)
                    || (b[0] == 172 && b[1] is >= 16 and <= 31) || (b[0] == 192 && b[1] == 168));
            });
        }
        catch (Exception ex) when (ex is System.Net.Sockets.SocketException or ArgumentException)
        {
            return false;
        }
    }
}
