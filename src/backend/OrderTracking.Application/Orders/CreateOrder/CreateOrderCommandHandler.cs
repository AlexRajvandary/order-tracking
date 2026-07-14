using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Orders.Models;
using OrderTracking.Domain.Entities;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Application.Orders.CreateOrder;

public sealed class CreateOrderCommandHandler : IRequestHandler<CreateOrderCommand, OrderDetailsDto>
{
    private const int MaxTrackingCodeAttempts = 5;
    private readonly IApplicationDbContext _context;
    private readonly ITrackingCodeGenerator _trackingCodeGenerator;
    private readonly ICurrentUserService _currentUserService;
    private readonly IDateTimeProvider _dateTimeProvider;

    public CreateOrderCommandHandler(
        IApplicationDbContext context,
        ITrackingCodeGenerator trackingCodeGenerator,
        ICurrentUserService currentUserService,
        IDateTimeProvider dateTimeProvider)
    {
        _context = context;
        _trackingCodeGenerator = trackingCodeGenerator;
        _currentUserService = currentUserService;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task<OrderDetailsDto> Handle(CreateOrderCommand request, CancellationToken cancellationToken)
    {
        if (_currentUserService.UserId is not { } adminId)
        {
            throw new UnauthorizedAccessException();
        }

        Guid? customerId = request.CustomerId;
        string? customerName = null;
        string? customerPhone = null;
        string? customerTelegram = null;
        string? customerEmail = null;

        if (HasNewCustomerData(request.NewCustomer))
        {
            var now = _dateTimeProvider.UtcNow;
            var customer = new Customer
            {
                Id = Guid.NewGuid(),
                FullName = Normalize(request.NewCustomer!.FullName),
                Telegram = NormalizeTelegram(request.NewCustomer.Telegram),
                Phone = Normalize(request.NewCustomer.Phone),
                Email = Normalize(request.NewCustomer.Email),
                CreatedAt = now,
                UpdatedAt = now,
            };

            _context.Customers.Add(customer);
            customerId = customer.Id;
            customerName = customer.FullName;
            customerPhone = customer.Phone;
            customerTelegram = customer.Telegram;
            customerEmail = customer.Email;
        }
        else if (customerId is { } existingId)
        {
            var customer = await _context.Customers
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == existingId, cancellationToken)
                ?? throw new KeyNotFoundException($"Customer '{existingId}' was not found");

            customerName = customer.FullName;
            customerPhone = customer.Phone;
            customerTelegram = customer.Telegram;
            customerEmail = customer.Email;
        }

        var orderNow = _dateTimeProvider.UtcNow;
        var trackingCode = await GenerateUniqueTrackingCodeAsync(cancellationToken);

        var order = new Order
        {
            Id = Guid.NewGuid(),
            TrackingCode = trackingCode,
            CustomerId = customerId,
            AdminNotes = Normalize(request.AdminNotes),
            CreatedByAdminId = adminId,
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
                SortOrder = index,
                CreatedAt = orderNow,
            })
            .ToList();

        _context.Orders.Add(order);

        foreach (var item in items)
        {
            _context.OrderItems.Add(item);
        }

        try
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            order.TrackingCode = await GenerateUniqueTrackingCodeAsync(cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);
        }

        return MapDetails(order, customerName, customerPhone, customerTelegram, customerEmail, items);
    }

    private static bool HasNewCustomerData(CreateOrderNewCustomerDto? customer) =>
        customer is not null
        && (
            !string.IsNullOrWhiteSpace(customer.FullName)
            || !string.IsNullOrWhiteSpace(customer.Telegram)
            || !string.IsNullOrWhiteSpace(customer.Phone)
            || !string.IsNullOrWhiteSpace(customer.Email));

    private async Task<string> GenerateUniqueTrackingCodeAsync(CancellationToken cancellationToken)
    {
        for (var attempt = 0; attempt < MaxTrackingCodeAttempts; attempt++)
        {
            var code = _trackingCodeGenerator.Generate(5);
            var exists = await _context.Orders
                .AnyAsync(o => o.TrackingCode == code, cancellationToken);

            if (!exists)
            {
                return code;
            }
        }

        throw new InvalidOperationException(
            "Failed to generate a unique tracking code after multiple attempts.");
    }

    private static bool IsUniqueViolation(DbUpdateException ex)
    {
        var message = ex.InnerException?.Message ?? ex.Message;
        return message.Contains("23505", StringComparison.Ordinal)
               || message.Contains("unique", StringComparison.OrdinalIgnoreCase)
               || message.Contains("duplicate", StringComparison.OrdinalIgnoreCase);
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

        return normalized.StartsWith('@') ? normalized : $"@{normalized.TrimStart('@')}";
    }

    private static OrderDetailsDto MapDetails(
        Order order,
        string? customerName,
        string? customerPhone,
        string? customerTelegram,
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
            customerEmail,
            order.AdminNotes,
            order.CreatedByAdminId,
            order.Status.ToString(),
            order.CreatedAt,
            order.UpdatedAt ?? order.CreatedAt,
            order.ExpectedDeliveryAt,
            items.Select(MapItem).ToList());
    }

    private static OrderItemDto MapItem(OrderItem item) =>
        new(
            item.Id,
            item.ItemType.ToString(),
            item.Name,
            item.Description,
            item.Quantity,
            item.SortOrder,
            item.CurrentStatusId,
            item.CurrentStatusText,
            item.CurrentStatusUpdatedAt);
}
