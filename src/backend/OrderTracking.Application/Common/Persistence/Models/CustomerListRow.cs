namespace OrderTracking.Application.Common.Persistence.Models;

public sealed record CustomerListRow(
    Guid Id,
    string? LastName,
    string? FirstName,
    string? Patronymic,
    string? Telegram,
    string? Phone,
    string? WhatsApp,
    string? Vk,
    string? Email,
    string? Notes,
    DateTimeOffset CreatedAt,
    int OrdersCount);

public sealed record CustomerSearchCriteria(
    string? Q,
    string? Phone,
    int Page,
    int PageSize);

public sealed record CustomerAddressListRow(
    Guid Id,
    Guid? CustomerId,
    string? City,
    string? Street,
    string? Building,
    string? Apartment,
    string? PostalCode,
    string? Note,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? LastUsedAt);

public sealed record AddressDuplicateCriteria(
    string? City,
    string? Street,
    string? Building,
    string? Apartment,
    string? PostalCode);
