using MediatR;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Persistence;

namespace OrderTracking.Application.Customers.GetCustomerAddresses;

public sealed class GetCustomerAddressesQueryHandler
    : IRequestHandler<GetCustomerAddressesQuery, IReadOnlyList<CustomerAddressDto>>
{
    private readonly ICustomerRepository _customers;

    public GetCustomerAddressesQueryHandler(ICustomerRepository customers)
    {
        _customers = customers;
    }

    public async Task<IReadOnlyList<CustomerAddressDto>> Handle(
        GetCustomerAddressesQuery request,
        CancellationToken cancellationToken)
    {
        if (request.CustomerId is { } customerId
            && !await _customers.ExistsAsync(customerId, cancellationToken))
        {
            throw new KeyNotFoundException($"Customer '{customerId}' was not found");
        }

        var rows = await _customers.GetAddressesByCustomerIdAsync(
            request.CustomerId,
            cancellationToken);

        return rows
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
                a.UpdatedAt,
                a.LastUsedAt))
            .ToList();
    }
}
