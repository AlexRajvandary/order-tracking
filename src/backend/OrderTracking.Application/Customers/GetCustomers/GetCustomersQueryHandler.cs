using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Models;
using OrderTracking.Application.Common.Realtime;
using OrderTracking.Application.Customers.Models;

namespace OrderTracking.Application.Customers.GetCustomers;

public sealed class GetCustomersQueryHandler : IRequestHandler<GetCustomersQuery, PaginatedList<CustomerDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IPresenceRegistry _presence;

    public GetCustomersQueryHandler(IApplicationDbContext context, IPresenceRegistry presence)
    {
        _context = context;
        _presence = presence;
    }

    public async Task<PaginatedList<CustomerDto>> Handle(
        GetCustomersQuery request,
        CancellationToken cancellationToken)
    {
        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 500);

        var query = _context.Customers.AsNoTracking();

        var totalCount = await query.CountAsync(cancellationToken);

        var rows = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new
            {
                c.Id,
                c.LastName,
                c.FirstName,
                c.Patronymic,
                c.Telegram,
                c.Phone,
                c.Email,
                c.Notes,
                c.CreatedAt,
                OrdersCount = c.Orders.Count,
            })
            .ToListAsync(cancellationToken);

        var online = _presence.GetOnlineCustomerIds();

        var items = rows
            .Select(c => new CustomerDto(
                c.Id,
                c.LastName,
                c.FirstName,
                c.Patronymic,
                CustomerNameFormatting.Format(c.LastName, c.FirstName, c.Patronymic),
                c.Telegram,
                c.Phone,
                c.Email,
                c.Notes,
                c.CreatedAt,
                c.OrdersCount,
                online.Contains(c.Id)))
            .ToList();

        return new PaginatedList<CustomerDto>(items, totalCount, page, pageSize);
    }
}
