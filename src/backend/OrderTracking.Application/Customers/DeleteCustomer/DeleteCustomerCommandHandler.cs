using MediatR;
using OrderTracking.Application.Common.Persistence;

namespace OrderTracking.Application.Customers.DeleteCustomer;

public sealed class DeleteCustomerCommandHandler : IRequestHandler<DeleteCustomerCommand>
{
    private readonly ICustomerRepository _customers;
    private readonly IUnitOfWork _unitOfWork;

    public DeleteCustomerCommandHandler(ICustomerRepository customers, IUnitOfWork unitOfWork)
    {
        _customers = customers;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(DeleteCustomerCommand request, CancellationToken cancellationToken)
    {
        var customer = await _customers.GetByIdTrackedAsync(request.Id, cancellationToken)
            ?? throw new KeyNotFoundException($"Customer '{request.Id}' was not found");

        _customers.Remove(customer);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
