using MediatR;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Models;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Common.Persistence.Models;
using OrderTracking.Application.Customers.Models;

namespace OrderTracking.Application.Customers.GetCustomerOrders;

public sealed class GetCustomerOrdersQueryHandler : IRequestHandler<GetCustomerOrdersQuery, PaginatedList<CustomerOrderSummaryDto>>
{
    private readonly ICustomerRepository _customers;
    private readonly IOrderRepository _orders;

    public GetCustomerOrdersQueryHandler(ICustomerRepository customers, IOrderRepository orders)
    {
        _customers = customers;
        _orders = orders;
    }

    public async Task<PaginatedList<CustomerOrderSummaryDto>> Handle(
        GetCustomerOrdersQuery request,
        CancellationToken cancellationToken)
    {
        var customerExists = await _customers.ExistsAsync(request.CustomerId, cancellationToken);

        if (!customerExists)
        {
            throw new KeyNotFoundException($"Customer '{request.CustomerId}' was not found");
        }

        var rows = await _orders.GetByCustomerIdAsync(
            request.CustomerId,
            request.Page,
            request.PageSize,
            cancellationToken);

        var items = rows.Items
            .Select(o => new CustomerOrderSummaryDto(
                o.Id,
                o.TrackingCode,
                o.CreatedAt,
                o.UpdatedAt))
            .ToList();

        return new PaginatedList<CustomerOrderSummaryDto>(items, rows.TotalCount, rows.Page, rows.PageSize);
    }
}
