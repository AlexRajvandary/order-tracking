using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Minio;
using Minio.DataModel.Args;
using OrderTracking.Application.Common.Interfaces;

namespace OrderTracking.Infrastructure.Storage;

public sealed class MinioObjectStorage : IObjectStorage
{
    private readonly IMinioClient _client;
    private readonly MinioSettings _settings;
    private readonly ILogger<MinioObjectStorage> _logger;
    private readonly SemaphoreSlim _bucketLock = new(1, 1);
    private bool _bucketReady;

    public MinioObjectStorage(
        IMinioClient client,
        IOptions<MinioSettings> settings,
        ILogger<MinioObjectStorage> logger)
    {
        _client = client;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task EnsureBucketExistsAsync(CancellationToken cancellationToken = default)
    {
        if (_bucketReady)
        {
            return;
        }

        await _bucketLock.WaitAsync(cancellationToken);
        try
        {
            if (_bucketReady)
            {
                return;
            }

            var exists = await _client.BucketExistsAsync(
                new BucketExistsArgs().WithBucket(_settings.Bucket),
                cancellationToken);

            if (!exists)
            {
                await _client.MakeBucketAsync(
                    new MakeBucketArgs().WithBucket(_settings.Bucket),
                    cancellationToken);
                _logger.LogInformation("Created MinIO bucket {Bucket}", _settings.Bucket);
            }

            _bucketReady = true;
        }
        finally
        {
            _bucketLock.Release();
        }
    }

    public async Task PutAsync(
        string objectKey,
        Stream content,
        string contentType,
        CancellationToken cancellationToken = default)
    {
        await EnsureBucketExistsAsync(cancellationToken);

        if (content.CanSeek)
        {
            content.Position = 0;
        }

        var length = content.CanSeek ? content.Length : -1;
        if (length < 0)
        {
            await using var buffer = new MemoryStream();
            await content.CopyToAsync(buffer, cancellationToken);
            buffer.Position = 0;
            await PutKnownLengthAsync(objectKey, buffer, buffer.Length, contentType, cancellationToken);
            return;
        }

        await PutKnownLengthAsync(objectKey, content, length, contentType, cancellationToken);
    }

    public async Task<Stream> GetAsync(string objectKey, CancellationToken cancellationToken = default)
    {
        await EnsureBucketExistsAsync(cancellationToken);

        var memory = new MemoryStream();
        await _client.GetObjectAsync(
            new GetObjectArgs()
                .WithBucket(_settings.Bucket)
                .WithObject(objectKey)
                .WithCallbackStream(stream => stream.CopyTo(memory)),
            cancellationToken);

        memory.Position = 0;
        return memory;
    }

    public async Task DeleteAsync(string objectKey, CancellationToken cancellationToken = default)
    {
        await EnsureBucketExistsAsync(cancellationToken);

        await _client.RemoveObjectAsync(
            new RemoveObjectArgs()
                .WithBucket(_settings.Bucket)
                .WithObject(objectKey),
            cancellationToken);
    }

    private async Task PutKnownLengthAsync(
        string objectKey,
        Stream content,
        long length,
        string contentType,
        CancellationToken cancellationToken)
    {
        await _client.PutObjectAsync(
            new PutObjectArgs()
                .WithBucket(_settings.Bucket)
                .WithObject(objectKey)
                .WithStreamData(content)
                .WithObjectSize(length)
                .WithContentType(contentType),
            cancellationToken);
    }
}
