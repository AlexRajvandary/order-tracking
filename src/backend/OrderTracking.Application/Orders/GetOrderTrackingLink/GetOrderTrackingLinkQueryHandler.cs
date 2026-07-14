using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Orders.Models;

namespace OrderTracking.Application.Orders.GetOrderTrackingLink;

public sealed class GetOrderTrackingLinkQueryHandler : IRequestHandler<GetOrderTrackingLinkQuery, TrackingLinkDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IConfiguration _configuration;

    public GetOrderTrackingLinkQueryHandler(
        IApplicationDbContext context,
        IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    public async Task<TrackingLinkDto> Handle(
        GetOrderTrackingLinkQuery request,
        CancellationToken cancellationToken)
    {
        var order = await _context.Orders
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == request.OrderId, cancellationToken)
            ?? throw new KeyNotFoundException($"Order '{request.OrderId}' was not found");

        var baseUrl = (_configuration["App:BaseUrl"] ?? "http://localhost:5173").TrimEnd('/');
        var url = $"{baseUrl}/track/{order.TrackingCode}";

        return new TrackingLinkDto(order.TrackingCode, url);
    }
}
