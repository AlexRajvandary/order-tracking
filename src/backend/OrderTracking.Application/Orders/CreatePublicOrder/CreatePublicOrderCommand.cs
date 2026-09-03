using MediatR;
using OrderTracking.Application.Orders.Models;

namespace OrderTracking.Application.Orders.CreatePublicOrder;

public sealed record PublicOrderItemDto(Guid ProductId, int Quantity);

public sealed record CreatePublicOrderCommand(
    string? Name,
    string? Phone,
    string? Telegram,
    string? WhatsApp,
    string? Vk,
    string? Address,
    IReadOnlyList<PublicOrderItemDto> Items) : IRequest<OrderDetailsDto>;
