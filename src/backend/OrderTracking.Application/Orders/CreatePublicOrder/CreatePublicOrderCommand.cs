using MediatR;
using OrderTracking.Application.Orders.Models;

namespace OrderTracking.Application.Orders.CreatePublicOrder;

public sealed record PublicOrderItemDto(string Source, Guid? ProductId, string? ExternalId, int Quantity, decimal? ExpectedUnitPrice, string? ExpectedCurrencyCode)
{
    public PublicOrderItemDto(Guid productId, int quantity) : this("Internal", productId, null, quantity, null, null) { }
}

public sealed record CreatePublicOrderCommand(
    string? Name,
    string? Phone,
    string? Telegram,
    string? WhatsApp,
    string? Vk,
    string? Address,
    IReadOnlyList<PublicOrderItemDto> Items) : IRequest<OrderDetailsDto>;
