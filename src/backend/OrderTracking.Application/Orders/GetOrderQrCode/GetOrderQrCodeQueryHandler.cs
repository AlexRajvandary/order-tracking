using MediatR;
using Microsoft.Extensions.Configuration;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Persistence;

namespace OrderTracking.Application.Orders.GetOrderQrCode;

public sealed class GetOrderQrCodeQueryHandler : IRequestHandler<GetOrderQrCodeQuery, OrderQrCodeResult>
{
    private readonly IOrderRepository _orderRepository;
    private readonly IConfiguration _configuration;
    private readonly IQrCodeGenerator _qrCodeGenerator;

    public GetOrderQrCodeQueryHandler(
        IOrderRepository orderRepository,
        IConfiguration configuration,
        IQrCodeGenerator qrCodeGenerator)
    {
        _orderRepository = orderRepository;
        _configuration = configuration;
        _qrCodeGenerator = qrCodeGenerator;
    }

    public async Task<OrderQrCodeResult> Handle(
        GetOrderQrCodeQuery request,
        CancellationToken cancellationToken)
    {
        var order = await _orderRepository.GetByIdUntrackedAsync(request.OrderId, cancellationToken)
            ?? throw new KeyNotFoundException($"Order '{request.OrderId}' was not found");

        var baseUrl = (_configuration["App:BaseUrl"] ?? "http://localhost:5173").TrimEnd('/');
        var trackingUrl = $"{baseUrl}/track/{order.TrackingCode}";
        var png = _qrCodeGenerator.GeneratePng(trackingUrl);

        return new OrderQrCodeResult(
            order.TrackingCode,
            trackingUrl,
            png,
            $"order-{order.TrackingCode}-qr.png");
    }
}
