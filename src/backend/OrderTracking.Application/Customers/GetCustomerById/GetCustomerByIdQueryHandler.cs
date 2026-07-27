using MediatR;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Common.Realtime;
using OrderTracking.Application.Customers.Models;

namespace OrderTracking.Application.Customers.GetCustomerById;

public sealed class GetCustomerByIdQueryHandler : IRequestHandler<GetCustomerByIdQuery, CustomerDto>
{
    private readonly ICustomerRepository _customers;
    private readonly IPresenceRegistry _presence;

    public GetCustomerByIdQueryHandler(ICustomerRepository customers, IPresenceRegistry presence)
    {
        _customers = customers;
        _presence = presence;
    }

    public async Task<CustomerDto> Handle(GetCustomerByIdQuery request, CancellationToken cancellationToken)
    {
        var row = await _customers.GetByIdUntrackedAsync(request.Id, cancellationToken)
            ?? throw new KeyNotFoundException($"Customer '{request.Id}' was not found");

        return new CustomerDto(
            row.Id,
            row.LastName,
            row.FirstName,
            row.Patronymic,
            CustomerNameFormatting.Format(row.LastName, row.FirstName, row.Patronymic),
            row.Telegram,
            row.Phone,
            row.Email,
            row.Notes,
            row.CreatedAt,
            row.OrdersCount,
            _presence.IsCustomerOnline(row.Id));
    }
}
