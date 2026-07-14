using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using OrderTracking.Application.Common.Interfaces;

namespace OrderTracking.Application.Orders.GetOrderQrCode;

public sealed class GetOrderQrCodeQueryHandler : IRequestHandler<GetOrderQrCodeQuery, OrderQrCodeResult>
{
    private readonly IApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IQrCodeGenerator _qrCodeGenerator;

    public GetOrderQrCodeQueryHandler(
        IApplicationDbContext context,
        IConfiguration configuration,
        IQrCodeGenerator qrCodeGenerator)
    {
        _context = context;
        _configuration = configuration;
        _qrCodeGenerator = qrCodeGenerator;
    }

    public async Task<OrderQrCodeResult> Handle(
        GetOrderQrCodeQuery request,
        CancellationToken cancellationToken)
    {
        var order = await _context.Orders
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == request.OrderId, cancellationToken)
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
