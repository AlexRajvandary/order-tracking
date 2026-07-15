namespace OrderTracking.Infrastructure.Monitoring;

public sealed class MonitoringSettings
{
    public const string SectionName = "Monitoring";

    public string HostDiskPath { get; set; } = "/host";
}
