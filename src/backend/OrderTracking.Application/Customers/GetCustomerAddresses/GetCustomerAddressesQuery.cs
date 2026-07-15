using MediatR;

namespace OrderTracking.Application.Customers.GetCustomerAddresses;

public sealed record CustomerAddressDto(
    Guid Id,
    Guid? CustomerId,
    string? City,
    string? Street,
    string? Building,
    string? Apartment,
    string? PostalCode,
    string? Note,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? LastUsedAt);

public sealed record GetCustomerAddressesQuery(Guid? CustomerId)
    : IRequest<IReadOnlyList<CustomerAddressDto>>;
