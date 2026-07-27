using MediatR;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Models;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Common.Persistence.Models;
using OrderTracking.Application.Common.Realtime;
using OrderTracking.Application.Customers.Models;

namespace OrderTracking.Application.Customers.SearchCustomers;

public sealed class SearchCustomersQueryHandler : IRequestHandler<SearchCustomersQuery, PaginatedList<CustomerDto>>
{
    private readonly ICustomerRepository _customers;
    private readonly IPresenceRegistry _presence;

    public SearchCustomersQueryHandler(ICustomerRepository customers, IPresenceRegistry presence)
    {
        _customers = customers;
        _presence = presence;
    }

    public async Task<PaginatedList<CustomerDto>> Handle(
        SearchCustomersQuery request,
        CancellationToken cancellationToken)
    {
        var rows = await _customers.SearchAsync(
            new CustomerSearchCriteria(request.Q, request.Phone, request.Page, request.PageSize),
            cancellationToken);

        var online = _presence.GetOnlineCustomerIds();

        var items = rows.Items
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

        return new PaginatedList<CustomerDto>(items, rows.TotalCount, rows.Page, rows.PageSize);
    }
}
