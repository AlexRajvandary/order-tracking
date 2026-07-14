using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Models;
using OrderTracking.Application.Customers.Models;

namespace OrderTracking.Application.Customers.GetCustomerOrders;

public sealed class GetCustomerOrdersQueryHandler : IRequestHandler<GetCustomerOrdersQuery, PaginatedList<CustomerOrderSummaryDto>>
{
    private readonly IApplicationDbContext _context;

    public GetCustomerOrdersQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<CustomerOrderSummaryDto>> Handle(
        GetCustomerOrdersQuery request,
        CancellationToken cancellationToken)
    {
        var customerExists = await _context.Customers
            .AnyAsync(c => c.Id == request.CustomerId, cancellationToken);

        if (!customerExists)
        {
            throw new KeyNotFoundException($"Customer '{request.CustomerId}' was not found");
        }

        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var query = _context.Orders
            .AsNoTracking()
            .Where(o => o.CustomerId == request.CustomerId);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(o => new CustomerOrderSummaryDto(
                o.Id,
                o.TrackingCode,
                o.CreatedAt,
                o.UpdatedAt ?? o.CreatedAt))
            .ToListAsync(cancellationToken);

        return new PaginatedList<CustomerOrderSummaryDto>(items, totalCount, page, pageSize);
    }
}
