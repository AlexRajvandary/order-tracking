using MediatR;
using Microsoft.Extensions.Configuration;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Orders.Models;

namespace OrderTracking.Application.Orders.GetOrderTrackingLink;

public sealed class GetOrderTrackingLinkQueryHandler : IRequestHandler<GetOrderTrackingLinkQuery, TrackingLinkDto>
{
    private readonly IOrderRepository _orderRepository;
    private readonly IConfiguration _configuration;

    public GetOrderTrackingLinkQueryHandler(
        IOrderRepository orderRepository,
        IConfiguration configuration)
    {
        _orderRepository = orderRepository;
        _configuration = configuration;
    }

    public async Task<TrackingLinkDto> Handle(
        GetOrderTrackingLinkQuery request,
        CancellationToken cancellationToken)
    {
        var order = await _orderRepository.GetByIdUntrackedAsync(request.OrderId, cancellationToken)
            ?? throw new KeyNotFoundException($"Order '{request.OrderId}' was not found");

        var baseUrl = (_configuration["App:BaseUrl"] ?? "http://localhost:5173").TrimEnd('/');
        var url = $"{baseUrl}/track/{order.TrackingCode}";

        return new TrackingLinkDto(order.TrackingCode, url);
    }
}
