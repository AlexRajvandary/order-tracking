using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Models;
using OrderTracking.Application.Orders.Models;

namespace OrderTracking.Application.Orders.SearchOrders;

public sealed class SearchOrdersQueryHandler : IRequestHandler<SearchOrdersQuery, PaginatedList<OrderListItemDto>>
{
    private readonly IApplicationDbContext _context;

    public SearchOrdersQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<OrderListItemDto>> Handle(
        SearchOrdersQuery request,
        CancellationToken cancellationToken)
    {
        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 500);

        var query = _context.Orders.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(request.TrackingCode))
        {
            var code = request.TrackingCode.Trim().ToUpperInvariant();
            query = query.Where(o => o.TrackingCode.Contains(code));
        }

        if (!string.IsNullOrWhiteSpace(request.CustomerName))
        {
            var name = request.CustomerName.Trim().ToLower();
            query = query.Where(o =>
                o.Customer != null
                && (
                    (o.Customer.LastName != null && o.Customer.LastName.ToLower().Contains(name))
                    || (o.Customer.FirstName != null && o.Customer.FirstName.ToLower().Contains(name))
                    || (o.Customer.Patronymic != null && o.Customer.Patronymic.ToLower().Contains(name))
                    || ((o.Customer.LastName ?? "") + " " + (o.Customer.FirstName ?? "") + " " + (o.Customer.Patronymic ?? ""))
                        .ToLower()
                        .Contains(name)));
        }

        if (!string.IsNullOrWhiteSpace(request.Phone))
        {
            var phone = request.Phone.Trim();
            query = query.Where(o =>
                o.Customer != null
                && o.Customer.Phone != null
                && o.Customer.Phone.Contains(phone));
        }

        if (!string.IsNullOrWhiteSpace(request.Q))
        {
            var term = request.Q.Trim();
            var termLower = term.ToLower();
            var termUpper = term.ToUpperInvariant();

            query = query.Where(o =>
                o.TrackingCode.Contains(termUpper)
                || (o.Customer != null
                    && (
                        (o.Customer.LastName != null && o.Customer.LastName.ToLower().Contains(termLower))
                        || (o.Customer.FirstName != null && o.Customer.FirstName.ToLower().Contains(termLower))
                        || (o.Customer.Patronymic != null && o.Customer.Patronymic.ToLower().Contains(termLower))
                        || ((o.Customer.LastName ?? "") + " " + (o.Customer.FirstName ?? "") + " " + (o.Customer.Patronymic ?? ""))
                            .ToLower()
                            .Contains(termLower)))
                || (o.Customer != null && o.Customer.Phone != null && o.Customer.Phone.Contains(term)));
        }

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
                o.Customer != null
                    ? ((o.Customer.LastName ?? "") + " " + (o.Customer.FirstName ?? "") + " " + (o.Customer.Patronymic ?? "")).Trim()
                    : null,
                o.Customer != null ? o.Customer.Phone : null,
                o.Customer != null ? o.Customer.Email : null,
                o.Customer != null ? o.Customer.Telegram : null,
                o.AdminNotes,
                o.Status.ToString(),
                o.Items.Count,
                o.CreatedAt,
                o.UpdatedAt ?? o.CreatedAt))
            .ToListAsync(cancellationToken);

        return new PaginatedList<OrderListItemDto>(items, totalCount, page, pageSize);
    }
}
