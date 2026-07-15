using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Minio;
using Minio.DataModel;
using Minio.DataModel.Args;
using Moq;
using OrderTracking.Infrastructure.Monitoring;
using OrderTracking.Infrastructure.Persistence;
using OrderTracking.Infrastructure.Services;
using OrderTracking.Infrastructure.Storage;
using Xunit;

namespace OrderTracking.Infrastructure.Tests.Services;

public sealed class StorageMetricsServiceTests
{
    [Fact]
    public async Task GetMetricsAsync_WhenMinioUnavailable_ReturnsErrorOnlyInMinioSection()
    {
        await using var dbContext = CreateDbContext();
        var minio = new Mock<IMinioClient>();
        minio
            .Setup(c => c.ListObjectsEnumAsync(
                It.IsAny<ListObjectsArgs>(),
                It.IsAny<CancellationToken>()))
            .Throws(new Exception("MinIO unreachable"));

        var service = CreateService(dbContext, minio.Object);

        var result = await service.GetMetricsAsync(CancellationToken.None);

        Assert.NotNull(result.Disk);
        Assert.Null(result.Disk.Error);
        Assert.True(result.Disk.TotalBytes > 0);
        Assert.NotNull(result.Minio.Error);
        Assert.Contains("MinIO unreachable", result.Minio.Error, StringComparison.Ordinal);
        Assert.Equal(0, result.Minio.ObjectsCount);
        Assert.Equal(0, result.Minio.SizeBytes);
        Assert.Equal("order-tracking", result.Minio.BucketName);
    }

    [Fact]
    public async Task GetMetricsAsync_WhenMinioHasObjects_AggregatesCountAndSize()
    {
        await using var dbContext = CreateDbContext();
        var minio = new Mock<IMinioClient>();

        minio
            .Setup(c => c.ListObjectsEnumAsync(
                It.IsAny<ListObjectsArgs>(),
                It.IsAny<CancellationToken>()))
            .Returns(CreateItemsAsync(
                CreateItem(false, 100),
                CreateItem(true, 0),
                CreateItem(false, 250)));

        var service = CreateService(dbContext, minio.Object);

        var result = await service.GetMetricsAsync(CancellationToken.None);

        Assert.Null(result.Minio.Error);
        Assert.Equal(2, result.Minio.ObjectsCount);
        Assert.Equal(350, result.Minio.SizeBytes);
        Assert.Equal("order-tracking", result.Minio.BucketName);
    }

    [Fact]
    public async Task GetMetricsAsync_DiskUsedPercentage_IsCalculatedFromTotalAndFree()
    {
        await using var dbContext = CreateDbContext();
        var minio = new Mock<IMinioClient>();
        minio
            .Setup(c => c.ListObjectsEnumAsync(
                It.IsAny<ListObjectsArgs>(),
                It.IsAny<CancellationToken>()))
            .Returns(CreateItemsAsync());

        var service = CreateService(dbContext, minio.Object);

        var result = await service.GetMetricsAsync(CancellationToken.None);

        Assert.Null(result.Disk.Error);
        Assert.Equal(result.Disk.TotalBytes - result.Disk.FreeBytes, result.Disk.UsedBytes);
        var expected = result.Disk.TotalBytes > 0
            ? Math.Round((double)result.Disk.UsedBytes / result.Disk.TotalBytes * 100, 2)
            : 0;
        Assert.Equal(expected, result.Disk.UsedPercentage);
    }

    private static StorageMetricsService CreateService(
        ApplicationDbContext dbContext,
        IMinioClient minioClient)
    {
        return new StorageMetricsService(
            dbContext,
            minioClient,
            Options.Create(new MinioSettings { Bucket = "order-tracking" }),
            Options.Create(new MonitoringSettings { HostDiskPath = "/host-that-does-not-exist" }),
            NullLogger<StorageMetricsService>.Instance);
    }

    private static ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }

    private static Item CreateItem(bool isDir, ulong size)
    {
        return new Item
        {
            IsDir = isDir,
            Size = size,
            Key = isDir ? "folder/" : $"file-{size}.bin"
        };
    }

    private static async IAsyncEnumerable<Item> CreateItemsAsync(params Item[] items)
    {
        foreach (var item in items)
        {
            yield return item;
            await Task.Yield();
        }
    }
}
