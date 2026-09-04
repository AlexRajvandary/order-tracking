using MediatR;
using OrderTracking.Application.Orders.Models;

namespace OrderTracking.Application.Orders.CreatePublicServiceRequest;

public enum PublicServiceRequestType
{
    Individual,
    Auction,
    Ticket,
}

public sealed record CreatePublicServiceRequestCommand(
    PublicServiceRequestType RequestType,
    string ContactType,
    string Contact,
    string CustomerName,
    string? SourceUrl,
    string? Description,
    string? EventName = null,
    string? EventDate = null,
    string? Location = null,
    int Quantity = 1,
    decimal? BudgetJpy = null) : IRequest<OrderDetailsDto>;
