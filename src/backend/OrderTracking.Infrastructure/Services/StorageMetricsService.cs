using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Minio;
using Minio.DataModel.Args;
using Npgsql;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Monitoring.Models;
using OrderTracking.Infrastructure.Monitoring;
using OrderTracking.Infrastructure.Persistence;
using OrderTracking.Infrastructure.Storage;

namespace OrderTracking.Infrastructure.Services;

public sealed class StorageMetricsService : IStorageMetricsService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly string? _productsConnectionString;
    private readonly IMinioClient _minioClient;
    private readonly MinioSettings _minioSettings;
    private readonly MonitoringSettings _monitoringSettings;
    private readonly ILogger<StorageMetricsService> _logger;

    public StorageMetricsService(
        ApplicationDbContext dbContext,
        IMinioClient minioClient,
        IOptions<MinioSettings> minioSettings,
        IOptions<MonitoringSettings> monitoringSettings,
        IConfiguration configuration,
        ILogger<StorageMetricsService> logger)
    {
        _dbContext = dbContext;
        _productsConnectionString = configuration.GetConnectionString("ProductsConnection");
        _minioClient = minioClient;
        _minioSettings = minioSettings.Value;
        _monitoringSettings = monitoringSettings.Value;
        _logger = logger;
    }

    public async Task<StorageMetricsDto> GetMetricsAsync(CancellationToken cancellationToken)
    {
        var disk = GetDiskMetrics();
        var database = await GetDatabaseMetricsAsync(cancellationToken);
        var productsDatabase = await GetProductsDatabaseMetricsAsync(cancellationToken);
        var minio = await GetMinioMetricsAsync(cancellationToken);

        return new StorageMetricsDto(disk, database, productsDatabase, minio);
    }

    private DiskMetrics GetDiskMetrics()
    {
        try
        {
            var drive = ResolveDrive();
            if (drive is null)
            {
                return new DiskMetrics(0, 0, 0, 0, "No ready drive found for disk metrics.");
            }

            var total = drive.TotalSize;
            var free = drive.TotalFreeSpace;
            var used = total - free;
            var usedPercentage = total > 0
                ? Math.Round((double)used / total * 100, 2)
                : 0;

            return new DiskMetrics(total, free, used, usedPercentage);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to read disk metrics");
            return new DiskMetrics(0, 0, 0, 0, ex.Message);
        }
    }

    private DriveInfo? ResolveDrive()
    {
        var hostPath = _monitoringSettings.HostDiskPath;

        if (!string.IsNullOrWhiteSpace(hostPath) && Directory.Exists(hostPath))
        {
            var hostDrive = new DriveInfo(hostPath);
            if (hostDrive.IsReady)
            {
                return hostDrive;
            }

            _logger.LogWarning(
                "Configured host disk path {HostDiskPath} is not ready; falling back to application drive",
                hostPath);
        }
        else if (!string.IsNullOrWhiteSpace(hostPath))
        {
            _logger.LogWarning(
                "Configured host disk path {HostDiskPath} does not exist; falling back to application drive",
                hostPath);
        }

        var root = Path.GetPathRoot(AppContext.BaseDirectory);
        if (string.IsNullOrWhiteSpace(root))
        {
            return null;
        }

        var fallback = new DriveInfo(root);
        return fallback.IsReady ? fallback : null;
    }

    private async Task<DatabaseMetrics> GetDatabaseMetricsAsync(CancellationToken cancellationToken)
    {
        try
        {
            var sizeBytes = await _dbContext.Database
                .SqlQueryRaw<long>("SELECT pg_database_size(current_database()) AS \"Value\"")
                .SingleAsync(cancellationToken);

            return new DatabaseMetrics(sizeBytes);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to read PostgreSQL database size");
            return new DatabaseMetrics(0, ex.Message);
        }
    }

    private async Task<DatabaseMetrics> GetProductsDatabaseMetricsAsync(CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_productsConnectionString))
        {
            return new DatabaseMetrics(0, "Products connection string is not configured.");
        }

        try
        {
            await using var connection = new NpgsqlConnection(_productsConnectionString);
            await connection.OpenAsync(cancellationToken);
            await using var command = new NpgsqlCommand(
                "SELECT pg_database_size(current_database())",
                connection);
            var result = await command.ExecuteScalarAsync(cancellationToken);
            return new DatabaseMetrics(Convert.ToInt64(result));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to read products PostgreSQL database size");
            return new DatabaseMetrics(0, ex.Message);
        }
    }

    private async Task<MinioMetrics> GetMinioMetricsAsync(CancellationToken cancellationToken)
    {
        var bucket = _minioSettings.Bucket;

        try
        {
            var args = new ListObjectsArgs()
                .WithBucket(bucket)
                .WithRecursive(true);

            long objectsCount = 0;
            long sizeBytes = 0;

            await foreach (var item in _minioClient
                .ListObjectsEnumAsync(args, cancellationToken)
                .WithCancellation(cancellationToken))
            {
                if (item.IsDir)
                {
                    continue;
                }

                objectsCount++;
                sizeBytes = checked(sizeBytes + (long)item.Size);
            }

            return new MinioMetrics(bucket, objectsCount, sizeBytes);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to read MinIO metrics for bucket {Bucket}", bucket);
            return new MinioMetrics(bucket, 0, 0, ex.Message);
        }
    }
}
