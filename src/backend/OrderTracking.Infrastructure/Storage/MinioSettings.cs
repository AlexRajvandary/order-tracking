namespace OrderTracking.Infrastructure.Storage;

public sealed class MinioSettings
{
    public const string SectionName = "Minio";

    public string Endpoint { get; set; } = "localhost:9000";
    public string AccessKey { get; set; } = "minioadmin";
    public string SecretKey { get; set; } = "minioadmin";
    public string Bucket { get; set; } = "order-tracking";
    public bool UseSsl { get; set; }
}
