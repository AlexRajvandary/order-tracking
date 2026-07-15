using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;
using OrderTracking.Application.Common.Interfaces;

namespace OrderTracking.Infrastructure.Storage;

public sealed class ImageSharpCompressor : IImageCompressor
{
    private const int MaxDimension = 1600;
    private const int WebpQuality = 80;

    public async Task<(Stream Content, string ContentType, string Extension)?> CompressAsync(
        Stream input,
        string? contentType,
        CancellationToken cancellationToken = default)
    {
        await using var buffer = new MemoryStream();
        await input.CopyToAsync(buffer, cancellationToken);
        buffer.Position = 0;

        if (buffer.Length == 0)
        {
            return null;
        }

        try
        {
            using var image = await Image.LoadAsync(buffer, cancellationToken);
            var needsResize = image.Width > MaxDimension || image.Height > MaxDimension;

            if (needsResize)
            {
                image.Mutate(x => x.Resize(new ResizeOptions
                {
                    Mode = ResizeMode.Max,
                    Size = new Size(MaxDimension, MaxDimension),
                }));
            }

            var output = new MemoryStream();
            await image.SaveAsWebpAsync(
                output,
                new WebpEncoder { Quality = WebpQuality },
                cancellationToken);
            output.Position = 0;
            return (output, "image/webp", ".webp");
        }
        catch (UnknownImageFormatException)
        {
            return null;
        }
    }
}
