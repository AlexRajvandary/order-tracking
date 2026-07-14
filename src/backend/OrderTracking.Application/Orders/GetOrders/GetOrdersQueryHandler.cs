using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Models;
using OrderTracking.Application.Orders.Models;

namespace OrderTracking.Application.Orders.GetOrders;

public sealed class GetOrdersQueryHandler : IRequestHandler<GetOrdersQuery, PaginatedList<OrderListItemDto>>
{
    private readonly IApplicationDbContext _context;

    public GetOrdersQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<OrderListItemDto>> Handle(
        GetOrdersQuery request,
        CancellationToken cancellationToken)
    {
        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 500);

        var query = _context.Orders.AsNoTracking();
        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(o => o.CreatedAt)
            .ThenByDescending(o => o.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(o => new OrderListItemDto(
                o.Id,
                o.TrackingCode,
                o.CustomerId,
                o.Customer != null ? o.Customer.FullName : null,
                o.Customer != null ? o.Customer.Phone : null,
                o.AdminNotes,
                o.Status.ToString(),
                o.Items.Count,
                o.CreatedAt,
                o.UpdatedAt ?? o.CreatedAt))
            .ToListAsync(cancellationToken);

        return new PaginatedList<OrderListItemDto>(items, totalCount, page, pageSize);
    }
}
