using MediatR;
using Microsoft.Extensions.Logging;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Common.Persistence.Models;
using OrderTracking.Application.Customers;
using OrderTracking.Application.Orders.Models;
using OrderTracking.Application.Orders.StatusHistory;
using OrderTracking.Domain.Common;
using OrderTracking.Domain.Entities;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Application.Orders.CreateOrder;

public sealed class CreateOrderCommandHandler : IRequestHandler<CreateOrderCommand, OrderDetailsDto>
{
    private const int MaxTrackingCodeAttempts = 5;
    private readonly ICustomerRepository _customerRepository;
    private readonly IOrderRepository _orderRepository;
    private readonly IStatusDefinitionRepository _statusDefinitionRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUserService;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly ILogger<CreateOrderCommandHandler> _logger;
    private readonly ITelegramAdminNotifier _telegramNotifier;
    private readonly ITrackingCodeGenerator _trackingCodeGenerator;

    public CreateOrderCommandHandler(
        IOrderRepository orderRepository,
        ICustomerRepository customerRepository,
        IStatusDefinitionRepository statusDefinitionRepository,
        IUnitOfWork unitOfWork,
        ITrackingCodeGenerator trackingCodeGenerator,
        ICurrentUserService currentUserService,
        IDateTimeProvider dateTimeProvider,
        ITelegramAdminNotifier telegramNotifier,
        ILogger<CreateOrderCommandHandler> logger)
    {
        _orderRepository = orderRepository;
        _customerRepository = customerRepository;
        _statusDefinitionRepository = statusDefinitionRepository;
        _unitOfWork = unitOfWork;
        _trackingCodeGenerator = trackingCodeGenerator;
        _currentUserService = currentUserService;
        _dateTimeProvider = dateTimeProvider;
        _telegramNotifier = telegramNotifier;
        _logger = logger;
    }

    public async Task<OrderDetailsDto> Handle(CreateOrderCommand request, CancellationToken cancellationToken)
    {
        var adminId = request.CreatedByAdminId ?? _currentUserService.UserId;
        if (adminId is null)
        {
            throw new UnauthorizedAccessException();
        }

        Guid? customerId = request.CustomerId;
        string? customerName = null;
        string? customerPhone = null;
        string? customerTelegram = null;
        string? customerWhatsApp = null;
        string? customerVk = null;
        string? customerEmail = null;

        if (HasNewCustomerData(request.NewCustomer))
        {
            var now = _dateTimeProvider.UtcNow;
            var customer = new Customer
            {
                Id = Guid.NewGuid(),
                LastName = CustomerNameFormatting.NormalizePart(request.NewCustomer!.LastName),
                FirstName = CustomerNameFormatting.NormalizePart(request.NewCustomer.FirstName),
                Patronymic = CustomerNameFormatting.NormalizePart(request.NewCustomer.Patronymic),
                Telegram = TelegramFormatting.Normalize(request.NewCustomer.Telegram),
                Phone = Normalize(request.NewCustomer.Phone),
                WhatsApp = Normalize(request.NewCustomer.WhatsApp),
                Vk = Normalize(request.NewCustomer.Vk),
                Email = Normalize(request.NewCustomer.Email),
                CreatedAt = now,
                UpdatedAt = now,
            };

            _customerRepository.Add(customer);
            customerId = customer.Id;
            customerName = CustomerNameFormatting.Format(
                customer.LastName,
                customer.FirstName,
                customer.Patronymic);
            customerPhone = customer.Phone;
            customerTelegram = customer.Telegram;
            customerWhatsApp = customer.WhatsApp;
            customerVk = customer.Vk;
            customerEmail = customer.Email;
        }
        else if (customerId is { } existingId)
        {
            var customer = await _customerRepository.GetByIdTrackedAsync(existingId, cancellationToken)
                ?? throw new KeyNotFoundException($"Customer '{existingId}' was not found");

            customerName = CustomerNameFormatting.Format(
                customer.LastName,
                customer.FirstName,
                customer.Patronymic);
            customerPhone = customer.Phone;
            customerTelegram = customer.Telegram;
            customerWhatsApp = customer.WhatsApp;
            customerVk = customer.Vk;
            customerEmail = customer.Email;
        }

        var delivery = await ResolveDeliveryAsync(request, customerId, cancellationToken);

        var orderNow = _dateTimeProvider.UtcNow;
        var trackingCode = await GenerateUniqueTrackingCodeAsync(cancellationToken);

        var order = new Order
        {
            Id = Guid.NewGuid(),
            TrackingCode = trackingCode,
            CustomerId = customerId,
            DeliveryAddressId = delivery.AddressId,
            DeliveryCity = delivery.City,
            DeliveryStreet = delivery.Street,
            DeliveryBuilding = delivery.Building,
            DeliveryApartment = delivery.Apartment,
            DeliveryPostalCode = delivery.PostalCode,
            DeliveryNote = delivery.Note,
            AdminNotes = Normalize(request.AdminNotes),
            CreatedByAdminId = adminId.Value,
            Status = OrderStatus.AwaitingPayment,
            CreatedAt = orderNow,
            UpdatedAt = orderNow,
        };

        var items = (request.Items ?? [])
            .Select((item, index) => new OrderItem
            {
                Id = Guid.NewGuid(),
                OrderId = order.Id,
                ItemType = item.ItemType,
                Name = item.Name.Trim(),
                Description = Normalize(item.Description),
                Quantity = item.Quantity <= 0 ? 1 : item.Quantity,
                UnitPrice = item.UnitPrice,
                CurrencyCode = item.UnitPrice.HasValue
                    ? CurrencyCodes.Normalize(item.CurrencyCode)
                    : null,
                SortOrder = index,
                CreatedAt = orderNow,
            })
            .ToList();

        _orderRepository.Add(order);

        foreach (var item in items)
        {
            _orderRepository.AddItem(item);
        }

        await ScheduledStatusHistorySeeder.SeedForItemsAsync(
            _orderRepository,
            _statusDefinitionRepository,
            order,
            items,
            adminId.Value,
            cancellationToken);

        try
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex) when (IsUniqueViolation(ex))
        {
            order.TrackingCode = await GenerateUniqueTrackingCodeAsync(cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        try
        {
            await _telegramNotifier.NotifyOrderCreatedAsync(
                order.Id,
                order.TrackingCode,
                customerName,
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Telegram notify failed for new order {OrderId}", order.Id);
        }

        return MapDetails(
            order,
            customerName,
            customerPhone,
            customerTelegram,
            customerWhatsApp,
            customerVk,
            customerEmail,
            items);
    }

    private async Task<string> GenerateUniqueTrackingCodeAsync(CancellationToken cancellationToken)
    {
        for (var attempt = 0; attempt < MaxTrackingCodeAttempts; attempt++)
        {
            var code = _trackingCodeGenerator.Generate(5);
            var exists = await _orderRepository.ExistsByTrackingCodeAsync(code, cancellationToken);

            if (!exists)
            {
                return code;
            }
        }

        throw new InvalidOperationException(
            "Failed to generate a unique tracking code after multiple attempts.");
    }

    private static bool HasDeliveryData(CreateOrderDeliveryAddressDto? address) =>
        address is not null
        && (
            !string.IsNullOrWhiteSpace(address.City)
            || !string.IsNullOrWhiteSpace(address.Street)
            || !string.IsNullOrWhiteSpace(address.Building)
            || !string.IsNullOrWhiteSpace(address.Apartment)
            || !string.IsNullOrWhiteSpace(address.PostalCode)
            || !string.IsNullOrWhiteSpace(address.Note));

    private static bool HasNewCustomerData(CreateOrderNewCustomerDto? customer) =>
        customer is not null
        && (
            !string.IsNullOrWhiteSpace(customer.LastName)
            || !string.IsNullOrWhiteSpace(customer.FirstName)
            || !string.IsNullOrWhiteSpace(customer.Patronymic)
            || !string.IsNullOrWhiteSpace(customer.Telegram)
            || !string.IsNullOrWhiteSpace(customer.Phone)
            || !string.IsNullOrWhiteSpace(customer.WhatsApp)
            || !string.IsNullOrWhiteSpace(customer.Vk)
            || !string.IsNullOrWhiteSpace(customer.Email));

    private static bool IsUniqueViolation(Exception ex)
    {
        for (var current = ex; current is not null; current = current.InnerException)
        {
            var message = current.Message;
            if (message.Contains("23505", StringComparison.Ordinal)
                || message.Contains("unique", StringComparison.OrdinalIgnoreCase)
                || message.Contains("duplicate", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    private static OrderDetailsDto MapDetails(
        Order order,
        string? customerName,
        string? customerPhone,
        string? customerTelegram,
        string? customerWhatsApp,
        string? customerVk,
        string? customerEmail,
        IReadOnlyList<OrderItem> items)
    {
        return new OrderDetailsDto(
            order.Id,
            order.TrackingCode,
            order.CustomerId,
            customerName,
            customerPhone,
            customerTelegram,
            customerWhatsApp,
            customerVk,
            customerEmail,
            order.AdminNotes,
            order.CreatedByAdminId,
            order.Status.ToString(),
            order.CreatedAt,
            order.UpdatedAt ?? order.CreatedAt,
            order.ExpectedDeliveryAt,
            order.DeliveryAddressId,
            order.DeliveryCity,
            order.DeliveryStreet,
            order.DeliveryBuilding,
            order.DeliveryApartment,
            order.DeliveryPostalCode,
            order.DeliveryNote,
            items.Select(MapItem).ToList());
    }

    private static OrderItemDto MapItem(OrderItem item) =>
        new(
            item.Id,
            item.ItemType.ToString(),
            item.Name,
            item.Description,
            item.Quantity,
            item.UnitPrice,
            item.CurrencyCode,
            item.SortOrder,
            item.CurrentStatusId,
            item.CurrentStatusText,
            item.CurrentStatusUpdatedAt);

    private static string? Normalize(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private async Task<(
        Guid? AddressId,
        string? City,
        string? Street,
        string? Building,
        string? Apartment,
        string? PostalCode,
        string? Note)> ResolveDeliveryAsync(
        CreateOrderCommand request,
        Guid? customerId,
        CancellationToken cancellationToken)
    {
        if (request.DeliveryAddressId is { } existingAddressId)
        {
            var address = await _customerRepository.GetAddressByIdAsync(
                existingAddressId, cancellationToken)
                ?? throw new KeyNotFoundException($"Delivery address '{existingAddressId}' was not found");

            if (address.CustomerId != customerId)
            {
                throw new InvalidOperationException(
                    "Delivery address does not belong to the selected customer");
            }

            return (
                address.Id,
                address.City,
                address.Street,
                address.Building,
                address.Apartment,
                address.PostalCode,
                address.Note);
        }

        if (!HasDeliveryData(request.DeliveryAddress))
        {
            return (null, null, null, null, null, null, null);
        }

        var city = Normalize(request.DeliveryAddress!.City);
        var street = Normalize(request.DeliveryAddress.Street);
        var building = Normalize(request.DeliveryAddress.Building);
        var apartment = Normalize(request.DeliveryAddress.Apartment);
        var postalCode = Normalize(request.DeliveryAddress.PostalCode);
        var note = Normalize(request.DeliveryAddress.Note);

        var cityKey = city?.ToLowerInvariant() ?? "";
        var streetKey = street?.ToLowerInvariant() ?? "";
        var buildingKey = building?.ToLowerInvariant() ?? "";
        var apartmentKey = apartment?.ToLowerInvariant() ?? "";
        var postalCodeKey = postalCode?.ToLowerInvariant() ?? "";

        var existingAddress = customerId is { } id
            ? await _customerRepository.FindDuplicateAddressAsync(
                id,
                new AddressDuplicateCriteria(cityKey, streetKey, buildingKey, apartmentKey, postalCodeKey),
                cancellationToken)
            : null;

        Guid addressId;
        if (existingAddress is not null)
        {
            addressId = existingAddress.Id;
        }
        else
        {
            var now = _dateTimeProvider.UtcNow;
            addressId = Guid.NewGuid();
            _customerRepository.AddAddress(new CustomerAddress
            {
                Id = addressId,
                CustomerId = customerId,
                City = city,
                Street = street,
                Building = building,
                Apartment = apartment,
                PostalCode = postalCode,
                Note = note,
                CreatedAt = now,
                UpdatedAt = now,
            });
        }

        return (addressId, city, street, building, apartment, postalCode, note);
    }
}
