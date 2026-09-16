namespace Products.Domain.Entities;

public sealed class LaptopSpecification
{
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public string? Model { get; set; }
    public string? ModelNumber { get; set; }
    public string? Color { get; set; }
    public string? Processor { get; set; }
    public int? RamGb { get; set; }
    public string? StorageType { get; set; }
    public int? StorageGb { get; set; }
    public decimal? ScreenSizeInches { get; set; }
    public string? OperatingSystem { get; set; }
    public string? Office { get; set; }
    public string? Graphics { get; set; }
    public bool? HasCopilotPlus { get; set; }
    public string? ReleaseModel { get; set; }
    public string? RawSpecificationsJson { get; set; }
}
