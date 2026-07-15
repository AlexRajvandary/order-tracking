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
            LastName = CustomerNameFormatting.NormalizePart(request.LastName),
            FirstName = CustomerNameFormatting.NormalizePart(request.FirstName),
            Patronymic = CustomerNameFormatting.NormalizePart(request.Patronymic),
            Telegram = TelegramFormatting.Normalize(request.Telegram),
            Phone = Normalize(request.Phone),
            Email = Normalize(request.Email),
            Notes = Normalize(request.Notes),
            CreatedAt = now,
            UpdatedAt = now,
        };

        _context.Customers.Add(customer);
        await _context.SaveChangesAsync(cancellationToken);

        return ToDto(customer, 0);
    }

    private static CustomerDto ToDto(Customer customer, int ordersCount) =>
        new(
            customer.Id,
            customer.LastName,
            customer.FirstName,
            customer.Patronymic,
            CustomerNameFormatting.Format(customer.LastName, customer.FirstName, customer.Patronymic),
            customer.Telegram,
            customer.Phone,
            customer.Email,
            customer.Notes,
            customer.CreatedAt,
            ordersCount);

    private static string? Normalize(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

}
