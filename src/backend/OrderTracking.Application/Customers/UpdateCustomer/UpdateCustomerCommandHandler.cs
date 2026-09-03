using MediatR;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Customers.Models;

namespace OrderTracking.Application.Customers.UpdateCustomer;

public sealed class UpdateCustomerCommandHandler : IRequestHandler<UpdateCustomerCommand, CustomerDto>
{
    private readonly ICustomerRepository _customers;
    private readonly IUnitOfWork _unitOfWork;

    public UpdateCustomerCommandHandler(ICustomerRepository customers, IUnitOfWork unitOfWork)
    {
        _customers = customers;
        _unitOfWork = unitOfWork;
    }

    public async Task<CustomerDto> Handle(UpdateCustomerCommand request, CancellationToken cancellationToken)
    {
        var customer = await _customers.GetByIdTrackedAsync(request.Id, cancellationToken)
            ?? throw new KeyNotFoundException($"Customer '{request.Id}' was not found");

        customer.LastName = CustomerNameFormatting.NormalizePart(request.LastName);
        customer.FirstName = CustomerNameFormatting.NormalizePart(request.FirstName);
        customer.Patronymic = CustomerNameFormatting.NormalizePart(request.Patronymic);
        customer.Telegram = TelegramFormatting.Normalize(request.Telegram);
        customer.Phone = Normalize(request.Phone);
        customer.WhatsApp = Normalize(request.WhatsApp);
        customer.Vk = Normalize(request.Vk);
        customer.Email = Normalize(request.Email);
        customer.Notes = Normalize(request.Notes);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var ordersCount = await _customers.CountOrdersForCustomerAsync(customer.Id, cancellationToken);

        return new CustomerDto(
            customer.Id,
            customer.LastName,
            customer.FirstName,
            customer.Patronymic,
            CustomerNameFormatting.Format(customer.LastName, customer.FirstName, customer.Patronymic),
            customer.Telegram,
            customer.Phone,
            customer.WhatsApp,
            customer.Vk,
            customer.Email,
            customer.Notes,
            customer.CreatedAt,
            ordersCount);
    }

    private static string? Normalize(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

}
