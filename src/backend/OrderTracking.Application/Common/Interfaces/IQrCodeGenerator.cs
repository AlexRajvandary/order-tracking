namespace OrderTracking.Application.Common.Interfaces;

public interface IQrCodeGenerator
{
    byte[] GeneratePng(string content, int pixelsPerModule = 20);
}
