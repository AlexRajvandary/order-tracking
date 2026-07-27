using OrderTracking.Application.Common.Models;
using OrderTracking.Application.Common.Persistence.Models;
using OrderTracking.Domain.Entities;

namespace OrderTracking.Application.Common.Persistence;

public interface ICustomerRepository
{
    void Add(Customer customer);

    void AddAddress(CustomerAddress address);

    Task<Customer?> GetByIdTrackedAsync(Guid id, CancellationToken cancellationToken = default);

    Task<CustomerListRow?> GetByIdUntrackedAsync(Guid id, CancellationToken cancellationToken = default);

    Task<bool> ExistsAsync(Guid id, CancellationToken cancellationToken = default);

    Task<int> CountAsync(CancellationToken cancellationToken = default);

    Task<PaginatedList<CustomerListRow>> GetPagedAsync(
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<PaginatedList<CustomerListRow>> SearchAsync(
        CustomerSearchCriteria criteria,
        CancellationToken cancellationToken = default);

    Task<int> CountOrdersForCustomerAsync(Guid customerId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<CustomerAddressListRow>> GetAddressesByCustomerIdAsync(
        Guid? customerId,
        CancellationToken cancellationToken = default);

    Task<CustomerAddress?> GetAddressByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<CustomerAddress?> FindDuplicateAddressAsync(
        Guid customerId,
        AddressDuplicateCriteria criteria,
        CancellationToken cancellationToken = default);

    Task<CustomerAuditSnapshotRow?> GetAuditSnapshotAsync(
        Guid id,
        bool includeDeleted,
        CancellationToken cancellationToken = default);
}
