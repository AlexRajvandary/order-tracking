namespace OrderTracking.Application.Common.Interfaces;

public interface IImageCompressor
{
    /// <summary>
    /// Compresses and normalizes an image to JPEG. Returns null if input is not a supported image.
    /// </summary>
    Task<(Stream Content, string ContentType, string Extension)?> CompressAsync(
        Stream input,
        string? contentType,
        CancellationToken cancellationToken = default);
}
