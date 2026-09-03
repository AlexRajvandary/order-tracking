using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Models;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Common.Persistence.Models;
using OrderTracking.Domain.Entities;

namespace OrderTracking.Infrastructure.Persistence.Repositories;

public sealed class CustomerRepository : ICustomerRepository
{
    private readonly ApplicationDbContext _db;

    public CustomerRepository(ApplicationDbContext db)
    {
        _db = db;
    }

    public void Add(Customer customer) => _db.Customers.Add(customer);

    public void AddAddress(CustomerAddress address) => _db.CustomerAddresses.Add(address);

    public Task<Customer?> GetByIdTrackedAsync(Guid id, CancellationToken cancellationToken = default) =>
        _db.Customers.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

    public Task<CustomerListRow?> GetByIdUntrackedAsync(Guid id, CancellationToken cancellationToken = default) =>
        _db.Customers
            .AsNoTracking()
            .Where(c => c.Id == id)
            .Select(c => new CustomerListRow(
                c.Id,
                c.LastName,
                c.FirstName,
                c.Patronymic,
                c.Telegram,
                c.Phone,
                c.WhatsApp,
                c.Vk,
                c.Email,
                c.Notes,
                c.CreatedAt,
                c.Orders.Count))
            .FirstOrDefaultAsync(cancellationToken);

    public Task<bool> ExistsAsync(Guid id, CancellationToken cancellationToken = default) =>
        _db.Customers.AnyAsync(c => c.Id == id, cancellationToken);

    public Task<int> CountAsync(CancellationToken cancellationToken = default) =>
        _db.Customers.CountAsync(cancellationToken);

    public async Task<PaginatedList<CustomerListRow>> GetPagedAsync(
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 500);

        var query = _db.Customers.AsNoTracking();
        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new CustomerListRow(
                c.Id,
                c.LastName,
                c.FirstName,
                c.Patronymic,
                c.Telegram,
                c.Phone,
                c.WhatsApp,
                c.Vk,
                c.Email,
                c.Notes,
                c.CreatedAt,
                c.Orders.Count))
            .ToListAsync(cancellationToken);

        return new PaginatedList<CustomerListRow>(items, totalCount, page, pageSize);
    }

    public async Task<PaginatedList<CustomerListRow>> SearchAsync(
        CustomerSearchCriteria criteria,
        CancellationToken cancellationToken = default)
    {
        var page = Math.Max(1, criteria.Page);
        var pageSize = Math.Clamp(criteria.PageSize, 1, 500);

        var query = _db.Customers.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(criteria.Q))
        {
            var term = criteria.Q.Trim().ToLower();
            query = query.Where(c =>
                (c.LastName != null && c.LastName.ToLower().Contains(term)) ||
                (c.FirstName != null && c.FirstName.ToLower().Contains(term)) ||
                (c.Patronymic != null && c.Patronymic.ToLower().Contains(term)) ||
                (((c.LastName ?? "") + " " + (c.FirstName ?? "") + " " + (c.Patronymic ?? "")).ToLower().Contains(term)) ||
                (c.Telegram != null && c.Telegram.ToLower().Contains(term)) ||
                (c.Email != null && c.Email.ToLower().Contains(term)) ||
                (c.Phone != null && c.Phone.Contains(criteria.Q.Trim())));
        }

        if (!string.IsNullOrWhiteSpace(criteria.Phone))
        {
            var phone = criteria.Phone.Trim();
            query = query.Where(c => c.Phone != null && c.Phone.Contains(phone));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new CustomerListRow(
                c.Id,
                c.LastName,
                c.FirstName,
                c.Patronymic,
                c.Telegram,
                c.Phone,
                c.WhatsApp,
                c.Vk,
                c.Email,
                c.Notes,
                c.CreatedAt,
                c.Orders.Count))
            .ToListAsync(cancellationToken);

        return new PaginatedList<CustomerListRow>(items, totalCount, page, pageSize);
    }

    public Task<int> CountOrdersForCustomerAsync(Guid customerId, CancellationToken cancellationToken = default) =>
        _db.Orders.CountAsync(o => o.CustomerId == customerId, cancellationToken);

    public async Task<IReadOnlyList<CustomerAddressListRow>> GetAddressesByCustomerIdAsync(
        Guid? customerId,
        CancellationToken cancellationToken = default) =>
        await _db.CustomerAddresses
            .AsNoTracking()
            .Where(a => a.CustomerId == customerId)
            .OrderByDescending(a => a.Orders.Max(order => (DateTimeOffset?)order.CreatedAt))
            .ThenByDescending(a => a.CreatedAt)
            .Select(a => new CustomerAddressListRow(
                a.Id,
                a.CustomerId,
                a.City,
                a.Street,
                a.Building,
                a.Apartment,
                a.PostalCode,
                a.Note,
                a.CreatedAt,
                a.UpdatedAt ?? a.CreatedAt,
                a.Orders.Max(order => (DateTimeOffset?)order.CreatedAt)))
            .ToListAsync(cancellationToken);

    public Task<CustomerAddress?> GetAddressByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _db.CustomerAddresses.FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

    public Task<CustomerAddress?> FindDuplicateAddressAsync(
        Guid customerId,
        AddressDuplicateCriteria criteria,
        CancellationToken cancellationToken = default)
    {
        var cityKey = criteria.City?.ToLowerInvariant() ?? "";
        var streetKey = criteria.Street?.ToLowerInvariant() ?? "";
        var buildingKey = criteria.Building?.ToLowerInvariant() ?? "";
        var apartmentKey = criteria.Apartment?.ToLowerInvariant() ?? "";
        var postalCodeKey = criteria.PostalCode?.ToLowerInvariant() ?? "";

        return _db.CustomerAddresses.FirstOrDefaultAsync(
            address =>
                address.CustomerId == customerId
                && (address.City ?? "").ToLower() == cityKey
                && (address.Street ?? "").ToLower() == streetKey
                && (address.Building ?? "").ToLower() == buildingKey
                && (address.Apartment ?? "").ToLower() == apartmentKey
                && (address.PostalCode ?? "").ToLower() == postalCodeKey,
            cancellationToken);
    }

    public async Task<CustomerAuditSnapshotRow?> GetAuditSnapshotAsync(
        Guid id,
        bool includeDeleted,
        CancellationToken cancellationToken = default)
    {
        var query = _db.Customers.AsNoTracking();
        if (includeDeleted)
        {
            query = query.IgnoreQueryFilters();
        }

        return await query
            .Where(c => c.Id == id)
            .Select(c => new CustomerAuditSnapshotRow(
                c.LastName,
                c.FirstName,
                c.Patronymic,
                c.Telegram,
                c.Phone,
                c.WhatsApp,
                c.Vk,
                c.Email,
                c.Notes,
                c.IsDeleted))
            .FirstOrDefaultAsync(cancellationToken);
    }
}
