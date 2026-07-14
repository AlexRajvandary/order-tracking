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
        var customer = await _context.Customers
            .AsNoTracking()
            .Where(c => c.Id == request.Id)
            .Select(c => new CustomerDto(
                c.Id,
                c.FullName,
                c.Telegram,
                c.Phone,
                c.Email,
                c.Notes,
                c.CreatedAt,
                c.Orders.Count))
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new KeyNotFoundException($"Customer '{request.Id}' was not found");

        return customer;
    }
}
