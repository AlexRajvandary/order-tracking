using MediatR;

namespace OrderTracking.Application.Orders.GetOrderQrCode;

public sealed record GetOrderQrCodeQuery(Guid OrderId) : IRequest<OrderQrCodeResult>;

public sealed record OrderQrCodeResult(
    string TrackingCode,
    string TrackingUrl,
    byte[] PngBytes,
    string FileName);
