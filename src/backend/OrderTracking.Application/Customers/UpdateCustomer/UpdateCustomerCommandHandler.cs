using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Customers.Models;

namespace OrderTracking.Application.Customers.UpdateCustomer;

public sealed class UpdateCustomerCommandHandler : IRequestHandler<UpdateCustomerCommand, CustomerDto>
{
    private readonly IApplicationDbContext _context;

    public UpdateCustomerCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<CustomerDto> Handle(UpdateCustomerCommand request, CancellationToken cancellationToken)
    {
        var customer = await _context.Customers
            .FirstOrDefaultAsync(c => c.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException($"Customer '{request.Id}' was not found");

        customer.FullName = Normalize(request.FullName);
        customer.Telegram = NormalizeTelegram(request.Telegram);
        customer.Phone = Normalize(request.Phone);
        customer.Email = Normalize(request.Email);
        customer.Notes = Normalize(request.Notes);

        await _context.SaveChangesAsync(cancellationToken);

        var ordersCount = await _context.Orders
            .CountAsync(o => o.CustomerId == customer.Id, cancellationToken);

        return new CustomerDto(
            customer.Id,
            customer.FullName,
            customer.Telegram,
            customer.Phone,
            customer.Email,
            customer.Notes,
            customer.CreatedAt,
            ordersCount);
    }

    private static string? Normalize(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string? NormalizeTelegram(string? value)
    {
        var normalized = Normalize(value);
        if (normalized is null)
        {
            return null;
        }

        return normalized.StartsWith('@') ? normalized : $"@{normalized}";
    }
}
