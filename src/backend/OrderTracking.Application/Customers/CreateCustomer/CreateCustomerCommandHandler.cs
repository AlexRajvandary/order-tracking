using MediatR;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Customers.Models;
using OrderTracking.Domain.Entities;

namespace OrderTracking.Application.Customers.CreateCustomer;

public sealed class CreateCustomerCommandHandler : IRequestHandler<CreateCustomerCommand, CustomerDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeProvider _clock;

    public CreateCustomerCommandHandler(IApplicationDbContext context, IDateTimeProvider clock)
    {
        _context = context;
        _clock = clock;
    }

    public async Task<CustomerDto> Handle(CreateCustomerCommand request, CancellationToken cancellationToken)
    {
        var now = _clock.UtcNow;
        var customer = new Customer
        {
            Id = Guid.NewGuid(),
            FullName = Normalize(request.FullName),
            Telegram = NormalizeTelegram(request.Telegram),
            Phone = Normalize(request.Phone),
            Email = Normalize(request.Email),
            Notes = Normalize(request.Notes),
            CreatedAt = now,
            UpdatedAt = now,
        };

        _context.Customers.Add(customer);
        await _context.SaveChangesAsync(cancellationToken);

        return new CustomerDto(
            customer.Id,
            customer.FullName,
            customer.Telegram,
            customer.Phone,
            customer.Email,
            customer.Notes,
            customer.CreatedAt,
            0);
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
