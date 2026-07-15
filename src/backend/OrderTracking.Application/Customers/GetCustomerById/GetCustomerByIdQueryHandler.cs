using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Customers.Models;

namespace OrderTracking.Application.Customers.GetCustomerById;

public sealed class GetCustomerByIdQueryHandler : IRequestHandler<GetCustomerByIdQuery, CustomerDto>
{
    private readonly IApplicationDbContext _context;

    public GetCustomerByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
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
            row.OrdersCount);
    }
}
