namespace OrderTracking.Application.Monitoring.Models;

public sealed record StorageMetricsDto(
    DiskMetrics Disk,
    DatabaseMetrics Database,
    MinioMetrics Minio);

public sealed record DiskMetrics(
    long TotalBytes,
    long FreeBytes,
    long UsedBytes,
    double UsedPercentage,
    string? Error = null);

public sealed record DatabaseMetrics(
    long SizeBytes,
    string? Error = null);

public sealed record MinioMetrics(
    string BucketName,
    long ObjectsCount,
    long SizeBytes,
    string? Error = null);
