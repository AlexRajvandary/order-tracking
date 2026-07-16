using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Realtime;
using OrderTracking.Application.Customers.Models;

namespace OrderTracking.Application.Customers.GetCustomerById;

public sealed class GetCustomerByIdQueryHandler : IRequestHandler<GetCustomerByIdQuery, CustomerDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IPresenceRegistry _presence;

    public GetCustomerByIdQueryHandler(IApplicationDbContext context, IPresenceRegistry presence)
    {
        _context = context;
        _presence = presence;
    }

    public async Task<CustomerDto> Handle(GetCustomerByIdQuery request, CancellationToken cancellationToken)
    {
        var row = await _context.Customers
            .AsNoTracking()
            .Where(c => c.Id == request.Id)
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
            .FirstOrDefaultAsync(cancellationToken)
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
