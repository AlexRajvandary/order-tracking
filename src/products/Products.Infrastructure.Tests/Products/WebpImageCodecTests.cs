using Products.Infrastructure.Services;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using Xunit;

namespace Products.Infrastructure.Tests.Webp;

public sealed class WebpImageCodecTests
{
    [Fact]
    public async Task Jpeg_becomes_webp_without_resizing()
    {
        using var image = new Image<Rgba32>(320, 180);
        using var jpeg = new MemoryStream();
        await image.SaveAsJpegAsync(jpeg);
        jpeg.Position = 0;

        using var webp = await WebpImageCodec.ConvertAsync(jpeg, 80, 12_000_000, CancellationToken.None);
        var result = await Image.IdentifyAsync(webp);

        Assert.NotNull(result);
        Assert.Equal("Webp", result.Metadata.DecodedImageFormat?.Name, ignoreCase: true);
        Assert.Equal(320, result.Width);
        Assert.Equal(180, result.Height);
    }

    [Fact]
    public async Task Oversized_dimensions_are_rejected_before_decoding()
    {
        using var image = new Image<Rgba32>(100, 100);
        using var jpeg = new MemoryStream();
        await image.SaveAsJpegAsync(jpeg);
        jpeg.Position = 0;

        await Assert.ThrowsAsync<InvalidDataException>(() =>
            WebpImageCodec.ConvertAsync(jpeg, 80, 9_999, CancellationToken.None));
    }

    [Fact]
    public async Task Invalid_image_is_not_converted()
    {
        using var invalid = new MemoryStream([1, 2, 3, 4]);
        await Assert.ThrowsAnyAsync<Exception>(() =>
            WebpImageCodec.ConvertAsync(invalid, 80, 12_000_000, CancellationToken.None));
    }

    [Fact]
    public async Task Cancellation_stops_conversion()
    {
        using var image = new Image<Rgba32>(100, 100);
        using var jpeg = new MemoryStream();
        await image.SaveAsJpegAsync(jpeg);
        jpeg.Position = 0;
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            WebpImageCodec.ConvertAsync(jpeg, 80, 12_000_000, cancellation.Token));
    }
}
