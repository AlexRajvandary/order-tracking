using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Models;
using OrderTracking.Application.Customers.Models;

namespace OrderTracking.Application.Customers.SearchCustomers;

public sealed class SearchCustomersQueryHandler : IRequestHandler<SearchCustomersQuery, PaginatedList<CustomerDto>>
{
    private readonly IApplicationDbContext _context;

    public SearchCustomersQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<CustomerDto>> Handle(
        SearchCustomersQuery request,
        CancellationToken cancellationToken)
    {
        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 500);

        var query = _context.Customers.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(request.Q))
        {
            var term = request.Q.Trim().ToLower();
            query = query.Where(c =>
                (c.LastName != null && c.LastName.ToLower().Contains(term)) ||
                (c.FirstName != null && c.FirstName.ToLower().Contains(term)) ||
                (c.Patronymic != null && c.Patronymic.ToLower().Contains(term)) ||
                (((c.LastName ?? "") + " " + (c.FirstName ?? "") + " " + (c.Patronymic ?? "")).ToLower().Contains(term)) ||
                (c.Telegram != null && c.Telegram.ToLower().Contains(term)) ||
                (c.Email != null && c.Email.ToLower().Contains(term)) ||
                (c.Phone != null && c.Phone.Contains(request.Q.Trim())));
        }

        if (!string.IsNullOrWhiteSpace(request.Phone))
        {
            var phone = request.Phone.Trim();
            query = query.Where(c => c.Phone != null && c.Phone.Contains(phone));
        }

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
                c.OrdersCount))
            .ToList();

        return new PaginatedList<CustomerDto>(items, totalCount, page, pageSize);
    }
}
