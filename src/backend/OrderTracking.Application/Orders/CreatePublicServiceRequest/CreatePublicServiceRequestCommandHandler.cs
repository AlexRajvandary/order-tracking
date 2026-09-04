using MediatR;
using Microsoft.Extensions.Configuration;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Orders.CreateOrder;
using OrderTracking.Application.Orders.Models;
using OrderTracking.Domain.Entities;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Application.Orders.CreatePublicServiceRequest;

public sealed class CreatePublicServiceRequestCommandHandler
    : IRequestHandler<CreatePublicServiceRequestCommand, OrderDetailsDto>
{
    private readonly IAdminUserRepository _adminUserRepository;

    private readonly IConfiguration _configuration;

    private readonly IMediator _mediator;

    public CreatePublicServiceRequestCommandHandler(
        IAdminUserRepository adminUserRepository,
        IConfiguration configuration,
        IMediator mediator)
    {
        _adminUserRepository = adminUserRepository;
        _configuration = configuration;
        _mediator = mediator;
    }

    public async Task<OrderDetailsDto> Handle(
        CreatePublicServiceRequestCommand request,
        CancellationToken cancellationToken)
    {
        var creator = await ResolveCreatorAsync(cancellationToken);
        var customer = CreateCustomer(request);
        var item = CreateItem(request);

        return await _mediator.Send(
            new CreateOrderCommand(
                null,
                customer,
                $"Заявка из формы: {GetRequestLabel(request.RequestType)}",
                null,
                null,
                [item],
                creator.Id),
            cancellationToken);
    }

    private static CreateOrderNewCustomerDto CreateCustomer(
        CreatePublicServiceRequestCommand request)
    {
        var contactType = request.ContactType.Trim().ToLowerInvariant();
        var contact = request.Contact.Trim();

        return new CreateOrderNewCustomerDto(
            null,
            request.CustomerName.Trim(),
            null,
            contactType == "telegram" ? contact : null,
            contactType == "phone" ? contact : null,
            contactType == "whatsapp" ? contact : null,
            contactType == "vk" ? contact : null,
            null);
    }

    private static CreateOrderItemDto CreateItem(CreatePublicServiceRequestCommand request)
    {
        return request.RequestType switch
        {
            PublicServiceRequestType.Auction => new CreateOrderItemDto(
                OrderItemType.Product,
                "Аукционный лот",
                Normalize(request.Description),
                1,
                request.BudgetJpy,
                request.BudgetJpy.HasValue ? "JPY" : null,
                Normalize(request.SourceUrl)),
            PublicServiceRequestType.Ticket => new CreateOrderItemDto(
                OrderItemType.Service,
                request.EventName!.Trim(),
                BuildTicketDescription(request),
                request.Quantity,
                null,
                null,
                Normalize(request.SourceUrl)),
            _ => new CreateOrderItemDto(
                OrderItemType.Product,
                "Индивидуальный запрос",
                request.Description!.Trim(),
                1,
                null,
                null,
                Normalize(request.SourceUrl)),
        };
    }

    private static string? BuildTicketDescription(CreatePublicServiceRequestCommand request)
    {
        var details = new List<string>();

        AddDetail(details, "Дата", request.EventDate);
        AddDetail(details, "Город / место", request.Location);

        if (request.BudgetJpy.HasValue)
        {
            details.Add($"Бюджет: {request.BudgetJpy.Value:0.##} JPY");
        }

        AddDetail(details, "Комментарий", request.Description);

        return details.Count == 0 ? null : string.Join(Environment.NewLine, details);
    }

    private static void AddDetail(List<string> details, string label, string? value)
    {
        if (!string.IsNullOrWhiteSpace(value))
        {
            details.Add($"{label}: {value.Trim()}");
        }
    }

    private static string GetRequestLabel(PublicServiceRequestType requestType)
    {
        return requestType switch
        {
            PublicServiceRequestType.Auction => "Аукцион",
            PublicServiceRequestType.Ticket => "Билеты",
            _ => "Индивидуальный запрос",
        };
    }

    private async Task<AdminUser> ResolveCreatorAsync(CancellationToken cancellationToken)
    {
        var login = _configuration["PublicCheckout:CreatedByAdminLogin"]
            ?? _configuration["Seed:AdminLogin"]
            ?? "admin";

        var creator = await _adminUserRepository.GetByLoginAsync(login, cancellationToken);

        if (creator is null || !creator.IsActive)
        {
            throw new InvalidOperationException(
                $"Active public checkout admin '{login}' was not found");
        }

        return creator;
    }

    private static string? Normalize(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
