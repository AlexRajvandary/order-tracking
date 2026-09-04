using MediatR;
using OrderTracking.Application.Orders.Models;

namespace OrderTracking.Application.Orders.CreatePublicIndividualRequest;

public sealed record CreatePublicIndividualRequestCommand(
    string ContactType,
    string Contact,
    string CustomerName,
    string? ProductUrl,
    string Description) : IRequest<OrderDetailsDto>;
