using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;

namespace OrderTracking.Application.Customers.GetCustomerAddresses;

public sealed class GetCustomerAddressesQueryHandler
    : IRequestHandler<GetCustomerAddressesQuery, IReadOnlyList<CustomerAddressDto>>
{
    private readonly IApplicationDbContext _context;

    public GetCustomerAddressesQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<CustomerAddressDto>> Handle(
        GetCustomerAddressesQuery request,
        CancellationToken cancellationToken)
    {
        if (request.CustomerId is { } customerId
            && !await _context.Customers.AnyAsync(c => c.Id == customerId, cancellationToken))
        {
            throw new KeyNotFoundException($"Customer '{customerId}' was not found");
        }

        return await _context.CustomerAddresses
            .AsNoTracking()
            .Where(a => a.CustomerId == request.CustomerId)
            .OrderByDescending(a => a.Orders.Max(order => (DateTimeOffset?)order.CreatedAt))
            .ThenByDescending(a => a.CreatedAt)
            .Select(a => new CustomerAddressDto(
                a.Id,
                a.CustomerId,
                a.City,
                a.Street,
                a.Building,
                a.Apartment,
                a.PostalCode,
                a.Note,
                a.CreatedAt,
                a.UpdatedAt ?? a.CreatedAt,
                a.Orders.Max(order => (DateTimeOffset?)order.CreatedAt)))
            .ToListAsync(cancellationToken);
    }
}
