using OrderTracking.Application.Common.Interfaces;
using QRCoder;

namespace OrderTracking.Infrastructure.Services;

public sealed class QrCodeGeneratorService : IQrCodeGenerator
{
    public byte[] GeneratePng(string content, int pixelsPerModule = 20)
    {
        using var generator = new QRCodeGenerator();
        using var data = generator.CreateQrCode(content, QRCodeGenerator.ECCLevel.Q);
        var png = new PngByteQRCode(data);
        return png.GetGraphic(pixelsPerModule);
    }
}
